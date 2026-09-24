import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {supabase} from './supabase';
import {demoCaregivers, services} from './data';
import type {Booking, Caregiver, Role, ServiceType} from './types';
import {
  Search,
  ShieldCheck,
  Star,
  MapPin,
  Heart,
  ChevronRight,
  X,
  Menu,
  PawPrint,
  UserRound,
  LogOut,
  Settings,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import './styles.css';

const money = (n:number) =>
  new Intl.NumberFormat('en-US',{
    style:'currency',
    currency:'USD'
  }).format(n);

function App(){

  const [view,setView] = useState<
    'home'|'search'|'caregiver'|'dashboard'|'admin'|'profile'
  >('home');

  const [service,setService] =
    useState<ServiceType|'all'>('all');

  const [city,setCity] =
    useState('Miami');

  const [caregivers,setCaregivers] =
    useState<Caregiver[]>(demoCaregivers);

  const [selected,setSelected] =
    useState<Caregiver|null>(null);

  const [authOpen,setAuthOpen] =
    useState(false);

  const [bookingOpen,setBookingOpen] =
    useState<Caregiver|null>(null);

  const [role,setRole] =
    useState<Role>('pet_parent');

  const [user,setUser] =
    useState<any>(null);

  const [toast,setToast] =
    useState('');

  const [mobile,setMobile] =
    useState(false);

  const [settings,setSettings] =
    useState({
      platformFeePct:20,
      fixedFee:0,
      holdDays:2
    });

  const [bookings,setBookings] =
    useState<Booking[]>([]);


  useEffect(()=>{

    const client = supabase;

    if(!client) return;


    client.auth.getUser().then(async({data})=>{

      const currentUser = data.user;

      setUser(currentUser);

      if(currentUser?.id){

        const {data:profile} =
          await client
            .from('profiles')
            .select('role')
            .eq('id',currentUser.id)
            .maybeSingle();

        if(profile?.role){
          setRole(profile.role as Role);
        }
      }

    });


    const {data:sub} =
      client.auth.onAuthStateChange(
        async(_event,session)=>{

          const currentUser =
            session?.user ?? null;

          setUser(currentUser);

          if(currentUser?.id){

            const {data:profile} =
              await client
                .from('profiles')
                .select('role')
                .eq('id',currentUser.id)
                .maybeSingle();

            if(profile?.role){
              setRole(profile.role as Role);
            }
          }

        }
      );


    loadCaregivers();


    return()=>{
      sub.subscription.unsubscribe();
    };

  },[]);


  async function loadCaregivers(){

    const client = supabase;

    if(!client) return;

    const {data} =
      await client
        .from('caregiver_public')
        .select('*')
        .order('rating',{ascending:false});

    if(data?.length){
      setCaregivers(data as Caregiver[]);
    }
  }


  const filtered =
    useMemo(
      ()=>caregivers.filter(c=>
        (service==='all'||c.services.includes(service)) &&
        (
          !city ||
          c.city
            .toLowerCase()
            .includes(city.toLowerCase())
        )
      ),
      [caregivers,service,city]
    );


  const nav = (v:any)=>{

    setView(v);
    setMobile(false);

    window.scrollTo({
      top:0,
      behavior:'smooth'
    });

  };


  const notify = (message:string)=>{

    setToast(message);

    setTimeout(
      ()=>setToast(''),
      3200
    );

  };


  async function logout(){

    if(supabase){
      await supabase.auth.signOut();
    }

    setUser(null);
    setRole('pet_parent');

    nav('home');

  }


  const editProfile = ()=>{
    nav('profile');
  };


  return (

    <div className="app">

      <header className="header">

        <div className="container navrow">

          <button
            className="brand"
            onClick={()=>nav('home')}
          >

            <span className="brandmark">
              <PawPrint size={19}/>
            </span>

            <span>
              Pet<span>Care</span>
            </span>

          </button>


          <nav
            className={
              mobile
                ? 'nav open'
                : 'nav'
            }
          >

            <button
              onClick={()=>nav('search')}
            >
              Find care
            </button>

            <button
              onClick={()=>nav('search')}
            >
              Services
            </button>

            <button
              onClick={()=>{
                setRole('caregiver');
                setAuthOpen(true);
              }}
            >
              Become a caregiver
            </button>

            {user?.email?.includes('admin') &&
              <button
                onClick={()=>nav('admin')}
              >
                Admin
              </button>
            }

          </nav>


          <div className="navactions">

            <button
              className="iconbtn mobilemenu"
              onClick={()=>setMobile(!mobile)}
            >
              {mobile ? <X/> : <Menu/>}
            </button>


            {user ?

              <button
                className="avatarbtn"
                onClick={()=>nav('dashboard')}
              >

                <UserRound size={18}/>

                <span>
                  My account
                </span>

              </button>

              :

              <button
                className="signin"
                onClick={()=>setAuthOpen(true)}
              >
                Sign in
              </button>

            }

          </div>

        </div>

      </header>


      {view==='home' &&
        <Home
          onSearch={(s,c)=>{
            setService(s);
            setCity(c);
            nav('search');
          }}
          onCaregiver={()=>{
            setRole('caregiver');
            setAuthOpen(true);
          }}
        />
      }


      {view==='search' &&
        <SearchPage
          caregivers={filtered}
          service={service}
          setService={setService}
          city={city}
          setCity={setCity}
          onSelect={(c)=>{
            setSelected(c);
            setView('caregiver');
          }}
          onBack={()=>nav('home')}
        />
      }


      {view==='caregiver' &&
        selected &&
        <CaregiverPage
          caregiver={selected}
          onBack={()=>nav('search')}
          onBook={()=>setBookingOpen(selected)}
        />
      }


      {view==='dashboard' &&
        <Dashboard
          user={user}
          bookings={bookings}
          role={role}
          onRole={setRole}
          onBook={()=>nav('search')}
          onLogout={logout}
          onEditProfile={editProfile}

          onConnect={async()=>{

            const client = supabase;

            if(!client){

              notify(
                'Demo mode: connect is ready in the Supabase Edge Functions.'
              );

              return;
            }


            const {
              data:acct,
              error
            } =
              await client.functions.invoke(
                'create-connect-account',
                {
                  body:{}
                }
              );


            if(error || acct?.error){

              notify(
                error?.message ||
                acct?.error ||
                'Could not create Stripe account'
              );

              return;
            }


            const {
              data:link,
              error:linkErr
            } =
              await client.functions.invoke(
                'create-account-link',
                {
                  body:{}
                }
              );


            if(linkErr || link?.error){

              notify(
                linkErr?.message ||
                link?.error ||
                'Could not create onboarding link'
              );

              return;
            }


            if(link?.url){
              window.location.href =
                link.url;
            }

          }}
        />
      }


      {view==='profile' &&
        role==='caregiver' &&
        user &&
        <CaregiverProfileEditor
          user={user}
          onBack={()=>nav('dashboard')}
          notify={notify}
        />
      }


      {view==='admin' &&
        <Admin
          settings={settings}
          setSettings={setSettings}

          onSave={async()=>{

            const client = supabase;

            if(!client){

              notify(
                'Demo mode: settings are local to this preview.'
              );

              return;
            }


            const {
              data,
              error
            } =
              await client.functions.invoke(
                'admin-settings',
                {
                  body:{
                    platform_fee_pct:
                      settings.platformFeePct,
                    fixed_fee:
                      settings.fixedFee,
                    hold_days:
                      settings.holdDays
                  }
                }
              );


            if(error || data?.error){

              notify(
                error?.message ||
                data?.error ||
                'Could not save settings'
              );

              return;
            }


            notify(
              'Marketplace settings saved'
            );

          }}
        />
      }


      <footer>

        <div className="container footergrid">

          <div>

            <div className="brand footerbrand">

              <span className="brandmark">
                <PawPrint size={18}/>
              </span>

              PetCare

            </div>

            <p>
              Trusted care, close to home.
            </p>

          </div>


          <div>

            <b>
              Pet parents
            </b>

            <button
              onClick={()=>nav('search')}
            >
              Find a caregiver
            </button>

            <button
              onClick={()=>nav('search')}
            >
              How it works
            </button>

          </div>


          <div>

            <b>
              Caregivers
            </b>

            <button
              onClick={()=>{
                setRole('caregiver');
                setAuthOpen(true);
              }}
            >
              Join PetCare
            </button>

            <button
              onClick={()=>nav('dashboard')}
            >
              Caregiver dashboard
            </button>

          </div>


          <div>

            <b>
              Trust & safety
            </b>

            <button>
              Payments
            </button>

            <button>
              Privacy
            </button>

          </div>

        </div>


        <div className="container copyright">

          © 2026 PetCare. MVP.

        </div>

      </footer>


      {authOpen &&
        <AuthModal
          role={role}
          setRole={setRole}
          onClose={()=>setAuthOpen(false)}

          onSuccess={(u)=>{
            setUser(u);
            setAuthOpen(false);
            notify('Welcome to PetCare');
            nav('dashboard');
          }}

          notify={notify}
        />
      }


      {bookingOpen &&
        <BookingModal
          caregiver={bookingOpen}
          feePct={settings.platformFeePct}
          fixedFee={settings.fixedFee}
          user={user}

          onClose={()=>
            setBookingOpen(null)
          }

          onDone={(b)=>{
            setBookings(
              x=>[b,...x]
            );

            setBookingOpen(null);

            notify(
              'Booking request created'
            );
          }}
        />
      }


      {toast &&
        <div className="toast">

          <CheckCircle2 size={18}/>

          {toast}

        </div>
      }

    </div>

  );
}


function Home({
  onSearch,
  onCaregiver
}:{
  onSearch:(s:any,c:string)=>void;
  onCaregiver:()=>void;
}){

  const [s,setS] =
    useState<ServiceType|'all'>(
      'walking'
    );

  const [c,setC] =
    useState('Miami');


  return <>

    <section className="hero">

      <div className="container herogrid">

        <div className="heroCopy">

          <div className="eyebrow">

            <ShieldCheck size={15}/>

            Built around trust

          </div>


          <h1>
            Pet care that feels <em>like home.</em>
          </h1>


          <p>
            Find trusted local caregivers for walks
            and day care, compare profiles, and
            request care in a few simple steps.
          </p>


          <div className="searchbox">

            <div className="field">

              <Search size={19}/>

              <div>

                <label>
                  Service
                </label>

                <select
                  value={s}
                  onChange={
                    e=>
                      setS(
                        e.target.value as any
                      )
                  }
                >

                  <option value="walking">
                    Dog walking
                  </option>

                  <option value="daycare">
                    Day care
                  </option>

                  <option value="all">
                    All care
                  </option>

                </select>

              </div>

            </div>


            <div className="field">

              <MapPin size={19}/>

              <div>

                <label>
                  Where
                </label>

                <input
                  value={c}
                  onChange={
                    e=>setC(e.target.value)
                  }
                  placeholder="City"
                />

              </div>

            </div>


            <button
              className="primary searchbtn"
              onClick={()=>
                onSearch(s,c)
              }
            >
              Search
            </button>

          </div>


          <div className="trustline">

            <span>
              <ShieldCheck size={16}/>
              Secure checkout
            </span>

            <span>
              <Star size={16}/>
              Real reviews
            </span>

            <span>
              <Heart size={16}/>
              Care matched to you
            </span>

          </div>

        </div>


        <div className="heroVisual">

          <div className="blob"></div>

          <div className="photoCard">

            <div className="photoemoji">
              🐶
            </div>


            <div className="floatingCard">

              <div className="miniAvatar">
                SM
              </div>

              <div>

                <b>
                  Sofía is available
                </b>

                <span>
                  4.9 · 38 reviews
                </span>

              </div>

              <CheckCircle2 size={21}/>

            </div>

          </div>

        </div>

      </div>

    </section>


    <section className="section">

      <div className="container">

        <div className="sectionhead">

          <div>

            <span className="kicker">
              Simple by design
            </span>

            <h2>
              Care for the moments that matter
            </h2>

          </div>


          <button
            className="textbtn"
            onClick={()=>
              onSearch('all','Miami')
            }
          >
            Explore all
            <ChevronRight size={17}/>
          </button>

        </div>


        <div className="servicegrid">

          {services.map(x=>

            <button
              className="serviceCard"
              key={x.id}
              onClick={()=>
                onSearch(x.id,'Miami')
              }
            >

              <span className="serviceicon">
                {x.icon}
              </span>

              <div>

                <h3>
                  {x.title}
                </h3>

                <p>
                  {x.subtitle}
                </p>

              </div>

              <ChevronRight/>

            </button>

          )}

        </div>

      </div>

    </section>


    <section className="section soft">

      <div className="container split">

        <div>

          <span className="kicker">
            For caregivers
          </span>

          <h2>
            Turn your love for pets into flexible work.
          </h2>

          <p>
            Create a profile, choose the services you offer,
            set your rates and receive booking requests.
            Payments are designed around a secure marketplace split.
          </p>

          <button
            className="primary"
            onClick={onCaregiver}
          >
            Become a caregiver
            <ChevronRight size={17}/>
          </button>

        </div>


        <div className="featurelist">

          <div>

            <span>
              01
            </span>

            <b>
              Create your profile
            </b>

            <p>
              Tell families about your experience and availability.
            </p>

          </div>


          <div>

            <span>
              02
            </span>

            <b>
              Get booked
            </b>

            <p>
              Accept requests that fit your schedule.
            </p>

          </div>


          <div>

            <span>
              03
            </span>

            <b>
              Get paid
            </b>

            <p>
              Connect Stripe for verified payouts.
            </p>

          </div>

        </div>

      </div>

    </section>

  </>;
}


function SearchPage({
  caregivers,
  service,
  setService,
  city,
  setCity,
  onSelect,
  onBack
}:{
  caregivers:Caregiver[];
  service:any;
  setService:(x:any)=>void;
  city:string;
  setCity:(x:string)=>void;
  onSelect:(c:Caregiver)=>void;
  onBack:()=>void;
}){

  return (

    <main className="container page">

      <button
        className="back"
        onClick={onBack}
      >
        <ArrowLeft size={17}/>
        Home
      </button>


      <div className="searchTitle">

        <div>

          <span className="kicker">
            Local caregivers
          </span>

          <h1>
            Find care near you
          </h1>

          <p>
            {caregivers.length}
            {' '}
            caregivers in or near
            {' '}
            {city || 'your area'}.
          </p>

        </div>


        <button className="filterbtn">

          <SlidersHorizontal size={17}/>

          Filters

        </button>

      </div>


      <div className="filters">

        <div className="field compact">

          <MapPin size={18}/>

          <input
            value={city}
            onChange={
              e=>setCity(e.target.value)
            }
            placeholder="City"
          />

        </div>


        {services.map(x=>

          <button
            key={x.id}
            className={
              service===x.id
                ? 'pill active'
                : 'pill'
            }
            onClick={()=>
              setService(x.id)
            }
          >
            {x.icon} {x.title}
          </button>

        )}


        <button
          className={
            service==='all'
              ? 'pill active'
              : 'pill'
          }
          onClick={()=>
            setService('all')
          }
        >
          All
        </button>

      </div>


      <div className="cards">

        {caregivers.map(c=>

          <CaregiverCard
            key={c.id}
            c={c}
            onClick={()=>
              onSelect(c)
            }
          />

        )}


        {!caregivers.length &&
          <div className="empty">

            <div>
              🐾
            </div>

            <h3>
              No caregivers found yet
            </h3>

            <p>
              Try another city or service.
              In Supabase mode, approved caregiver
              profiles appear here automatically.
            </p>

          </div>
        }

      </div>

    </main>

  );
}


function CaregiverCard({
  c,
  onClick
}:{
  c:Caregiver;
  onClick:()=>void;
}){

  return (

    <button
      className="careCard"
      onClick={onClick}
    >

      <div className="carePhoto">

        <div className="avatarbig">

          {c.display_name
            .split(' ')
            .map(x=>x[0])
            .join('')
            .slice(0,2)}

        </div>


        <span className="verified">

          <ShieldCheck size={13}/>

          Verified

        </span>

      </div>


      <div className="careBody">

        <div className="careTop">

          <h3>
            {c.display_name}
          </h3>

          <span>

            {money(c.hourly_rate)}

            <small>
              /service
            </small>

          </span>

        </div>


        <div className="rating">

          <Star
            size={15}
            fill="currentColor"
          />

          {c.rating.toFixed(1)}

          <span>
            ({c.review_count})
          </span>

          {' · '}

          {c.city}, {c.state}

        </div>


        <p>
          {c.bio}
        </p>


        <div className="tagrow">

          {c.services.map(s=>

            <span key={s}>

              {s==='walking'
                ? 'Paseos'
                : 'Guardería'}

            </span>

          )}

        </div>

      </div>

    </button>

  );
}


function CaregiverPage({
  caregiver,
  onBack,
  onBook
}:{
  caregiver:Caregiver;
  onBack:()=>void;
  onBook:()=>void;
}){

  return (

    <main className="container page">

      <button
        className="back"
        onClick={onBack}
      >
        <ArrowLeft size={17}/>
        Back to caregivers
      </button>


      <div className="profile">

        <div className="profileHero">

          <div className="avatarxl">

            {caregiver.display_name
              .split(' ')
              .map(x=>x[0])
              .join('')
              .slice(0,2)}

          </div>


          <div>

            <span className="verifiedText">

              <ShieldCheck size={15}/>

              Identity & profile review

            </span>


            <h1>
              {caregiver.display_name}
            </h1>


            <div className="rating big">

              <Star
                size={17}
                fill="currentColor"
              />

              {caregiver.rating.toFixed(1)}
              {' · '}
              {caregiver.review_count} reviews
              {' · '}
              {caregiver.city}, {caregiver.state}

            </div>

          </div>


          <button
            className="primary"
            onClick={onBook}
          >
            Request a booking
          </button>

        </div>


        <div className="profilegrid">

          <div className="panel">

            <h2>
              About {caregiver.display_name.split(' ')[0]}
            </h2>

            <p>
              {caregiver.bio}
            </p>


            <div className="stats">

              <div>

                <b>
                  {caregiver.years_experience}
                </b>

                <span>
                  years experience
                </span>

              </div>


              <div>

                <b>
                  {caregiver.services.length}
                </b>

                <span>
                  services
                </span>

              </div>


              <div>

                <b>
                  100%
                </b>

                <span>
                  response goal
                </span>

              </div>

            </div>

          </div>


          <div className="panel">

            <h2>
              Services & rates
            </h2>


            {caregiver.services.map(s=>

              <div
                className="rate"
                key={s}
              >

                <span>

                  {s==='walking'
                    ? '🐕 Dog walking'
                    : '🏡 Day care'}

                </span>


                <b>
                  {money(caregiver.hourly_rate)}
                </b>

              </div>

            )}


            <div className="safe">

              <ShieldCheck size={18}/>

              <div>

                <b>
                  Secure marketplace
                </b>

                <p>
                  Your payment is handled through the platform.
                  Caregivers never receive your card details.
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </main>

  );
}


function AuthModal({
  role,
  setRole,
  onClose,
  onSuccess,
  notify
}:{
  role:Role;
  setRole:(r:Role)=>void;
  onClose:()=>void;
  onSuccess:(u:any)=>void;
  notify:(m:string)=>void;
}){

  const [mode,setMode] =
    useState<'signin'|'signup'>(
      'signup'
    );

  const [email,setEmail] =
    useState('');

  const [password,setPassword] =
    useState('');

  const [name,setName] =
    useState('');

  const [loading,setLoading] =
    useState(false);


  const submit = async()=>{

    setLoading(true);


    const client = supabase;


    if(!client){

      const u={
        id:'demo-user',
        email,
        name:name||'Demo user',
        role
      };

      localStorage.setItem(
        'petcare_demo_user',
        JSON.stringify(u)
      );

      setLoading(false);

      onSuccess(u);

      return;
    }


    try{

      if(mode==='signup'){

        const {
          data,
          error
        } =
          await client.auth.signUp({
            email,
            password,
            options:{
              data:{
                display_name:name,
                role
              }
            }
          });


        if(error)
          throw error;


        notify(
          'Check your email if confirmation is enabled.'
        );


        onSuccess(data.user);

      }else{

        const {
          data,
          error
        } =
          await client.auth.signInWithPassword({
            email,
            password
          });


        if(error)
          throw error;


        onSuccess(data.user);

      }

    }catch(e:any){

      notify(
        e.message ||
        'Authentication error'
      );

    }finally{

      setLoading(false);

    }

  };


  return (

    <div className="modalback">

      <div className="modal auth">

        <button
          className="close"
          onClick={onClose}
        >
          <X/>
        </button>


        <div className="authlogo">

          <span className="brandmark">
            <PawPrint size={18}/>
          </span>

          <b>
            PetCare
          </b>

        </div>


        <h2>
          {mode==='signup'
            ? 'Join PetCare'
            : 'Welcome back'}
        </h2>


        <p>
          {mode==='signup'
            ? 'Create an account to book care or become a caregiver.'
            : 'Sign in to manage your bookings and profile.'}
        </p>


        <div className="roleToggle">

          <button
            className={
              role==='pet_parent'
                ? 'selected'
                : ''
            }
            onClick={()=>
              setRole('pet_parent')
            }
          >
            Pet parent
          </button>


          <button
            className={
              role==='caregiver'
                ? 'selected'
                : ''
            }
            onClick={()=>
              setRole('caregiver')
            }
          >
            Caregiver
          </button>

        </div>


        {mode==='signup' &&
          <label>

            Full name

            <input
              value={name}
              onChange={
                e=>setName(e.target.value)
              }
              placeholder="Your name"
            />

          </label>
        }


        <label>

          Email

          <input
            type="email"
            value={email}
            onChange={
              e=>setEmail(e.target.value)
            }
            placeholder="you@example.com"
          />

        </label>


        <label>

          Password

          <input
            type="password"
            value={password}
            onChange={
              e=>setPassword(e.target.value)
            }
            placeholder="At least 8 characters"
          />

        </label>


        <button
          className="primary full"
          onClick={submit}
          disabled={loading}
        >
          {loading
            ? 'Please wait…'
            : mode==='signup'
              ? 'Create account'
              : 'Sign in'}
        </button>


        <div className="authswitch">

          {mode==='signup'
            ? 'Already have an account?'
            : 'New to PetCare?'}

          {' '}

          <button
            onClick={()=>
              setMode(
                mode==='signup'
                  ? 'signin'
                  : 'signup'
              )
            }
          >

            {mode==='signup'
              ? 'Sign in'
              : 'Create account'}

          </button>

        </div>


        <small className="securitynote">

          <ShieldCheck size={14}/>

          Auth is handled by Supabase.
          Never share payment secrets in the browser.

        </small>

      </div>

    </div>

  );
}


function BookingModal({
  caregiver,
  feePct,
  fixedFee,
  user,
  onClose,
  onDone
}:{
  caregiver:Caregiver;
  feePct:number;
  fixedFee:number;
  user:any;
  onClose:()=>void;
  onDone:(b:Booking)=>void;
}){

  const [date,setDate] =
    useState(
      new Date(
        Date.now()+86400000
      )
        .toISOString()
        .slice(0,10)
    );


  const [hours,setHours] =
    useState(1);


  const gross =
    caregiver.hourly_rate*hours;


  const platform =
    Math.round(
      (
        gross*feePct/100+
        fixedFee
      )*100
    )/100;


  const caregiverAmt =
    Math.max(
      0,
      gross-platform
    );


  const confirm = async()=>{

    const b:Booking={

      id:crypto.randomUUID(),

      service_type:
        caregiver.services[0],

      caregiver_id:
        caregiver.id,

      customer_id:
        user?.id ||
        'demo-user',

      start_at:
        date+'T09:00:00',

      end_at:
        date+'T10:00:00',

      total_amount:
        gross,

      platform_fee:
        platform,

      caregiver_amount:
        caregiverAmt,

      status:
        'pending',

      caregiver

    };


    const client = supabase;


    if(
      client &&
      user?.id &&
      !caregiver.id.startsWith('demo-')
    ){

      const {
        data,
        error
      } =
        await client
          .from('bookings')
          .insert({
            customer_id:
              user.id,

            caregiver_id:
              caregiver.id,

            service_type:
              b.service_type,

            start_at:
              b.start_at,

            end_at:
              b.end_at,

            total_amount:
              gross,

            platform_fee:
              platform,

            caregiver_amount:
              caregiverAmt,

            status:
              'pending'
          })
          .select(
            '*, caregiver:caregiver_public(*)'
          )
          .single();


      if(error){

        alert(error.message);

        return;

      }


      onDone(
        data as Booking
      );

      return;

    }


    onDone(b);

  };


  return (

    <div className="modalback">

      <div className="modal booking">

        <button
          className="close"
          onClick={onClose}
        >
          <X/>
        </button>


        <span className="kicker">
          Request care
        </span>


        <h2>
          Book with {caregiver.display_name.split(' ')[0]}
        </h2>


        <p>
          Choose a date and review the marketplace split
          before continuing to secure checkout.
        </p>


        <label>

          Date

          <input
            type="date"
            value={date}
            onChange={
              e=>setDate(e.target.value)
            }
          />

        </label>


        <label>

          Units / hours

          <select
            value={hours}
            onChange={
              e=>
                setHours(
                  Number(e.target.value)
                )
            }
          >

            {[1,2,3,4,5,6,8].map(h=>

              <option
                key={h}
                value={h}
              >
                {h}
                {' '}
                {h===1
                  ? 'hour'
                  : 'hours'}
              </option>

            )}

          </select>

        </label>


        <div className="pricebox">

          <div>

            <span>
              Care total
            </span>

            <b>
              {money(gross)}
            </b>

          </div>


          <div>

            <span>
              Platform fee ({feePct}%)
            </span>

            <b>
              {money(platform)}
            </b>

          </div>


          <div className="total">

            <span>
              Customer total
            </span>

            <b>
              {money(gross)}
            </b>

          </div>


          <div className="splitline">

            <span>
              Caregiver share
            </span>

            <strong>
              {money(caregiverAmt)}
            </strong>

          </div>

        </div>


        <button
          className="primary full"
          onClick={confirm}
        >

          <CreditCard size={17}/>

          Continue to secure payment

        </button>


        <small className="muted">

          Demo mode does not charge a card.
          Production checkout will be created by a secure
          Supabase Edge Function using Stripe Connect.

        </small>

      </div>

    </div>

  );
}


function Dashboard({
  user,
  bookings,
  role,
  onRole,
  onBook,
  onLogout,
  onConnect,
  onEditProfile
}:{
  user:any;
  bookings:Booking[];
  role:Role;
  onRole:(r:Role)=>void;
  onBook:()=>void;
  onLogout:()=>void;
  onConnect:()=>void;
  onEditProfile:()=>void;
}){

  return (

    <main className="container page">

      <div className="dashhead">

        <div>

          <span className="kicker">
            Your workspace
          </span>


          <h1>
            {role==='caregiver'
              ? 'Caregiver dashboard'
              : 'My PetCare'}
          </h1>


          <p>
            {user?.email ||
              'Demo account'}

            {' · '}

            {role==='caregiver'
              ? 'Caregiver'
              : 'Pet parent'}
          </p>

        </div>


        <button
          className="ghost"
          onClick={onLogout}
        >

          <LogOut size={17}/>

          Sign out

        </button>

      </div>


      {role==='caregiver' ?

        <div className="dashboardgrid">


          <div className="panel wide">

            <div className="paneltitle">

              <h2>
                Today
              </h2>

              <span className="status">
                Profile active
              </span>

            </div>


            <div className="earnings">

              <div>

                <span>
                  Available earnings
                </span>

                <b>
                  $0.00
                </b>

              </div>


              <div>

                <span>
                  Pending bookings
                </span>

                <b>
                  {
                    bookings.filter(
                      x=>x.status==='pending'
                    ).length
                  }
                </b>

              </div>


              <div>

                <span>
                  Rating
                </span>

                <b>
                  New
                </b>

              </div>

            </div>


            <div className="connectCard">

              <div>

                <CreditCard/>

                <div>

                  <b>
                    Connect Stripe payouts
                  </b>

                  <p>
                    Stripe handles identity verification
                    and bank payout onboarding.
                    Your secret payment credentials
                    stay server-side.
                  </p>

                </div>

              </div>


              <button
                className="primary"
                onClick={onConnect}
              >
                Connect Stripe
              </button>

            </div>

          </div>


          <div className="panel">

            <h2>
              Profile
            </h2>


            <p>
              Complete your photo, bio, services,
              rates and availability to appear in search.
            </p>


            <button
              className="secondary"
              onClick={onEditProfile}
            >
              Edit profile
            </button>

          </div>

        </div>


        :

        <div className="dashboardgrid">


          <div className="panel wide">

            <div className="paneltitle">

              <h2>
                Upcoming
              </h2>


              <button
                className="textbtn"
                onClick={onBook}
              >
                Find care
                <ChevronRight size={16}/>
              </button>

            </div>


            {bookings.length ?

              bookings.map(b=>

                <div
                  className="bookingrow"
                  key={b.id}
                >

                  <div className="bookingicon">
                    🐾
                  </div>


                  <div>

                    <b>

                      {b.service_type==='walking'
                        ? 'Dog walking'
                        : 'Day care'}

                    </b>


                    <span>

                      {b.start_at.slice(0,10)}

                      {' · '}

                      {b.status}

                    </span>

                  </div>


                  <strong>

                    {
                      money(
                        b.total_amount ??
                        (
                          (b as any)
                            .total_amount_cents ||
                          0
                        )/100
                      )
                    }

                  </strong>

                </div>

              )

              :

              <div className="empty small">

                <div>
                  🗓️
                </div>

                <h3>
                  No bookings yet
                </h3>

                <p>
                  Find a caregiver and request your first booking.
                </p>


                <button
                  className="primary"
                  onClick={onBook}
                >
                  Find care
                </button>

              </div>

            }

          </div>


          <div className="panel">

            <h2>
              Account
            </h2>


            <p>
              Keep your profile and pet information up to date.
            </p>


            <button className="secondary">
              Manage profile
            </button>

          </div>

        </div>

      }

    </main>

  );
}


function CaregiverProfileEditor({
  user,
  onBack,
  notify
}:{
  user:any;
  onBack:()=>void;
  notify:(message:string)=>void;
}){

  const [loading,setLoading] =
    useState(true);

  const [saving,setSaving] =
    useState(false);


  const [displayName,setDisplayName] =
    useState('');

  const [city,setCity] =
    useState('');

  const [state,setState] =
    useState('');

  const [bio,setBio] =
    useState('');

  const [yearsExperience,setYearsExperience] =
    useState(0);


  const [walking,setWalking] =
    useState(false);

  const [daycare,setDaycare] =
    useState(false);


  const [walkingRate,setWalkingRate] =
    useState('');

  const [daycareRate,setDaycareRate] =
    useState('');


  useEffect(()=>{

    loadProfile();

  },[]);


  async function loadProfile(){

    const client = supabase;

    if(!client || !user?.id){

      setLoading(false);

      return;
    }


    setLoading(true);


    try{

      const [
        profileResult,
        caregiverResult,
        servicesResult
      ] = await Promise.all([

        client
          .from('profiles')
          .select(
            'display_name,avatar_url,city,state'
          )
          .eq('id',user.id)
          .single(),

        client
          .from('caregiver_profiles')
          .select(
            'bio,years_experience'
          )
          .eq('id',user.id)
          .single(),

        client
          .from('caregiver_services')
          .select(
            'service_type,rate_cents,active'
          )
          .eq('caregiver_id',user.id)

      ]);


      if(profileResult.error)
        throw profileResult.error;


      if(caregiverResult.error)
        throw caregiverResult.error;


      if(servicesResult.error)
        throw servicesResult.error;


      const profile =
        profileResult.data;

      const caregiver =
        caregiverResult.data;

      const serviceRows =
        servicesResult.data || [];


      setDisplayName(
        profile?.display_name || ''
      );


      setCity(
        profile?.city || ''
      );


      setState(
        profile?.state || ''
      );


      setBio(
        caregiver?.bio || ''
      );


      setYearsExperience(
        caregiver?.years_experience || 0
      );


      const walkingRow =
        serviceRows.find(
          (x:any)=>
            x.service_type==='walking'
        );


      const daycareRow =
        serviceRows.find(
          (x:any)=>
            x.service_type==='daycare'
        );


      setWalking(
        !!walkingRow?.active
      );


      setDaycare(
        !!daycareRow?.active
      );


      if(walkingRow){

        setWalkingRate(
          (
            Number(
              walkingRow.rate_cents || 0
            )/100
          ).toFixed(2)
        );

      }


      if(daycareRow){

        setDaycareRate(
          (
            Number(
              daycareRow.rate_cents || 0
            )/100
          ).toFixed(2)
        );

      }

    }catch(error:any){

      notify(
        error?.message ||
        'Could not load caregiver profile'
      );

    }finally{

      setLoading(false);

    }

  }


  async function saveProfile(){

    const client = supabase;

    if(!client || !user?.id)
      return;


    if(!displayName.trim()){

      notify(
        'Please enter your name'
      );

      return;

    }


    if(!city.trim() || !state.trim()){

      notify(
        'Please enter your city and state'
      );

      return;

    }


    if(!walking && !daycare){

      notify(
        'Select at least one service'
      );

      return;

    }


    if(
      walking &&
      Number(walkingRate)<=0
    ){

      notify(
        'Enter a valid Dog walking rate'
      );

      return;

    }


    if(
      daycare &&
      Number(daycareRate)<=0
    ){

      notify(
        'Enter a valid Day care rate'
      );

      return;

    }


    setSaving(true);


    try{

      const {
        error:profileError
      } =
        await client
          .from('profiles')
          .update({

            display_name:
              displayName.trim(),

            city:
              city.trim(),

            state:
              state.trim()

          })
          .eq('id',user.id);


      if(profileError)
        throw profileError;


      const {
        error:caregiverError
      } =
        await client
          .from('caregiver_profiles')
          .update({

            bio:
              bio.trim(),

            years_experience:
              Math.max(
                0,
                Math.floor(
                  Number(yearsExperience)||0
                )
              )

          })
          .eq('id',user.id);


      if(caregiverError)
        throw caregiverError;


      const serviceRows = [

        {
          caregiver_id:
            user.id,

          service_type:
            'walking',

          rate_cents:
            Math.round(
              Number(
                walkingRate || 0
              )*100
            ),

          active:
            walking

        },


        {
          caregiver_id:
            user.id,

          service_type:
            'daycare',

          rate_cents:
            Math.round(
              Number(
                daycareRate || 0
              )*100
            ),

          active:
            daycare

        }

      ];


      const {
        error:servicesError
      } =
        await client
          .from('caregiver_services')
          .upsert(
            serviceRows,
            {
              onConflict:
                'caregiver_id,service_type'
            }
          );


      if(servicesError)
        throw servicesError;


      notify(
        'Profile saved successfully'
      );


      await loadCaregiversAfterSave(
        client
      );


      onBack();


    }catch(error:any){

      notify(
        error?.message ||
        'Could not save profile'
      );

    }finally{

      setSaving(false);

    }

  }


  async function loadCaregiversAfterSave(
    client:any
  ){

    const {data} =
      await client
        .from('caregiver_public')
        .select('*')
        .order(
          'rating',
          {ascending:false}
        );

    if(data?.length){
      // The main caregiver list will refresh
      // on the next application load.
    }

  }


  if(loading){

    return (

      <main className="container page">

        <div className="panel">

          <p>
            Loading your profile...
          </p>

        </div>

      </main>

    );

  }


  return (

    <main className="container page">

      <button
        className="back"
        onClick={onBack}
      >
        <ArrowLeft size={17}/>
        Back to dashboard
      </button>


      <div className="dashhead">

        <div>

          <span className="kicker">
            Caregiver profile
          </span>

          <h1>
            Edit your profile
          </h1>

          <p>
            Complete your information so pet parents
            can learn about you.
          </p>

        </div>

      </div>


      <div className="settingsgrid">


        <div className="panel">

          <h2>
            Basic information
          </h2>


          <label>

            Full name

            <input
              value={displayName}
              onChange={
                e=>setDisplayName(
                  e.target.value
                )
              }
              placeholder="Your full name"
            />

          </label>


          <label>

            City

            <input
              value={city}
              onChange={
                e=>setCity(
                  e.target.value
                )
              }
              placeholder="Miami"
            />

          </label>


          <label>

            State

            <input
              value={state}
              onChange={
                e=>setState(
                  e.target.value
                )
              }
              placeholder="Florida"
            />

          </label>


          <label>

            Years of experience

            <input
              type="number"
              min="0"
              value={yearsExperience}
              onChange={
                e=>setYearsExperience(
                  Number(e.target.value)
                )
              }
            />

          </label>


          <label>

            About you

            <textarea
              value={bio}
              onChange={
                e=>setBio(
                  e.target.value
                )
              }
              placeholder="Tell pet parents about your experience with animals..."
              rows={6}
            />

          </label>

        </div>


        <div className="panel">

          <h2>
            Services & rates
          </h2>


          <p className="muted">
            Choose the services you offer and set your rate.
          </p>


          <div className="serviceEdit">

            <label className="check">

              <input
                type="checkbox"
                checked={walking}
                onChange={
                  e=>setWalking(
                    e.target.checked
                  )
                }
              />


              <div>

                <b>
                  🐕 Dog walking
                </b>

                <span>
                  Walk and exercise dogs.
                </span>

              </div>

            </label>


            {walking &&
              <label>

                Dog walking rate ($)

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={walkingRate}
                  onChange={
                    e=>setWalkingRate(
                      e.target.value
                    )
                  }
                  placeholder="25.00"
                />

              </label>
            }

          </div>


          <div className="serviceEdit">

            <label className="check">

              <input
                type="checkbox"
                checked={daycare}
                onChange={
                  e=>setDaycare(
                    e.target.checked
                  )
                }
              />


              <div>

                <b>
                  🏡 Day care
                </b>

                <span>
                  Provide daytime care for pets.
                </span>

              </div>

            </label>


            {daycare &&
              <label>

                Day care rate ($)

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={daycareRate}
                  onChange={
                    e=>setDaycareRate(
                      e.target.value
                    )
                  }
                  placeholder="40.00"
                />

              </label>
            }

          </div>


          <button
            className="primary full"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : 'Save profile'}
          </button>


          <button
            className="secondary full"
            onClick={onBack}
            disabled={saving}
          >
            Cancel
          </button>

        </div>

      </div>

    </main>

  );

}


function Admin({
  settings,
  setSettings,
  onSave
}:{
  settings:any;
  setSettings:(s:any)=>void;
  onSave:()=>void;
}){

  return (

    <main className="container page">

      <div className="dashhead">

        <div>

          <span className="kicker">
            Platform operations
          </span>

          <h1>
            Marketplace settings
          </h1>

          <p>
            Configure the commercial rules that
            the secure payment function will read.
          </p>

        </div>


        <div className="adminbadge">

          <Settings size={17}/>

          Admin

        </div>

      </div>


      <div className="settingsgrid">


        <div className="panel">

          <h2>
            Payments & split
          </h2>


          <p className="muted">
            These values are illustrative for the MVP.
            Production changes should be restricted
            to administrators and audited.
          </p>


          <label>

            Platform commission (%)

            <input
              type="number"
              min="0"
              max="100"
              value={settings.platformFeePct}
              onChange={
                e=>setSettings({
                  ...settings,
                  platformFeePct:
                    Number(e.target.value)
                })
              }
            />

          </label>


          <label>

            Fixed platform fee ($)

            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.fixedFee}
              onChange={
                e=>setSettings({
                  ...settings,
                  fixedFee:
                    Number(e.target.value)
                })
              }
            />

          </label>


          <label>

            Payout hold (days)

            <input
              type="number"
              min="0"
              max="30"
              value={settings.holdDays}
              onChange={
                e=>setSettings({
                  ...settings,
                  holdDays:
                    Number(e.target.value)
                })
              }
            />

          </label>


          <button
            className="primary full"
            onClick={onSave}
          >
            Save settings
          </button>

        </div>


        <div className="panel">

          <h2>
            Security checklist
          </h2>


          <div className="check">

            <CheckCircle2/>

            <div>

              <b>
                RLS enabled
              </b>

              <span>
                Database policies protect
                customer/caregiver data.
              </span>

            </div>

          </div>


          <div className="check">

            <CheckCircle2/>

            <div>

              <b>
                Secret keys server-side
              </b>

              <span>
                Stripe secret and service-role keys
                never ship to Netlify.
              </span>

            </div>

          </div>


          <div className="check">

            <CheckCircle2/>

            <div>

              <b>
                Webhook verification
              </b>

              <span>
                Stripe webhooks are verified
                inside the Edge Function.
              </span>

            </div>

          </div>


          <div className="check">

            <Sparkles/>

            <div>

              <b>
                Auditable fee rules
              </b>

              <span>
                Each booking stores the fee snapshot
                used at checkout.
              </span>

            </div>

          </div>

        </div>

      </div>

    </main>

  );
}


createRoot(
  document.getElementById('root')!
).render(
  <App/>
);
