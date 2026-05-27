import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/KinesciusHome.css";

import Logo from "../assets/Logo.png";
import Bicis from "../assets/Bicis.png";
import KinesiologoRodilla from "../assets/KinesiologoRodilla.png";
import ImagenCentro from "../assets/image.png";
import Borrar from "../assets/Borrar.png";


const SLIDES = [Bicis, ImagenCentro, KinesiologoRodilla, Bicis, Borrar];

const SERVICES = [
  {
    icon: "💪",
    title: "Rehabilitación Tren Superior",
    desc: "Tratamiento integral de hombros, codos, muñecas y columna cervical. Recuperamos movilidad, fuerza y funcionalidad en miembros superiores con técnicas manuales y ejercicio terapéutico.",
  },
  {
    icon: "🧘",
    title: "Rehabilitación Zona Media",
    desc: "Abordaje de la columna lumbar, pelvis y core muscular. Trabajamos sobre el control postural, la estabilización profunda y la reducción del dolor para devolverte la capacidad funcional.",
  },
  {
    icon: "🦵",
    title: "Rehabilitación Tren Inferior",
    desc: "Atención de rodillas, caderas, tobillos y pies. Desde postquirúrgicos hasta lesiones deportivas, diseñamos un plan progresivo para que recuperes tu marcha, equilibrio y rendimiento.",
  },
];

const VALUES = [
  "Atención personalizada en cada sesión",
  "Tecnología de rehabilitación de vanguardia",
  "Seguimiento continuo del progreso del paciente",
  "Equipo certificado con formación continua",
];

const PLATFORM_FEATURES = [
  {
    icon: "📅",
    title: "Reservá turnos online",
    desc: "Elegí el día y horario que mejor te quede, sin llamadas ni esperas.",
  },
  {
    icon: "🔔",
    title: "Consultá tus próximas sesiones",
    desc: "Accedé en cualquier momento a tus horarios confirmados y recordatorios.",
  },
  {
    icon: "📊",
    title: "Seguimiento de asistencias",
    desc: "Revisá tu historial de sesiones y el avance de tu tratamiento.",
  },
  {
    icon: "💳",
    title: "Gestión de cuotas",
    desc: "Los clientes abonados pueden administrar su plan y mantener todo al día.",
  },
];

export default function KinesciusHome() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const fadeRefs = useRef([]);

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Carousel auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Intersection Observer for fade-in sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    fadeRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const addFadeRef = (el) => {
    if (el && !fadeRefs.current.includes(el)) {
      fadeRefs.current.push(el);
    }
  };

  const handlePedirTurno = () => {
    // Si el usuario no está logueado, va a login
    // Una vez logueado, redirigir a /mis-turnos desde el login
    navigate("/login");
  };

  return (
    <div>
      {/* ── NAVBAR ── */}
      <nav className={`kn-nav${scrolled ? " scrolled" : ""}`}>
        <a href="#home" className="kn-nav-brand">
          <div className="kn-nav-logo">
            <img src={Logo} alt="Kinescius Logo" />
          </div>
          <span className="kn-nav-name">KINESCIUS</span>
        </a>
        <ul className="kn-nav-links">
          <li>
            <a href="/login" className="kn-btn-ghost">
              Iniciar sesión
            </a>
          </li>
          <li>
            <a href="/registro" className="kn-btn-outline">
              Registrarse
            </a>
          </li>
          <li>
            <button className="kn-btn-cta" onClick={handlePedirTurno}>
              Pedir turno
            </button>
          </li>
        </ul>
      </nav>

      {/* ── HERO ── */}
      <section className="kn-hero" id="home">
        <div className="kn-hero-bg-shape" />

        <div className="kn-hero-content">
          <div className="kn-hero-badge">
            <span className="kn-hero-badge-dot" />
            Centro de Rehabilitación Integral
          </div>

          <h1 className="kn-hero-title">
           Bienvenidos a <em>Kinescius</em>
          </h1>

          <p className="kn-hero-desc">
            Trabajamos para brindarte una atención profesional, cercana y organizada,
            acompañándote en cada etapa de tu recuperación y bienestar físico.
          </p>

          <div className="kn-hero-actions">
            <button className="kn-btn-primary" onClick={handlePedirTurno}>
              Pedir un turno
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <a href="#about" className="kn-btn-secondary">
              Conocer el centro
            </a>
          </div>

          <div className="kn-hero-stats">
            <div className="kn-stat-item">
              <div className="kn-stat-num">+500</div>
              <div className="kn-stat-label">Pacientes tratados</div>
            </div>
            <div className="kn-stat-item">
              <div className="kn-stat-num">8+</div>
              <div className="kn-stat-label">Años de experiencia</div>
            </div>
            <div className="kn-stat-item">
              <div className="kn-stat-num">15</div>
              <div className="kn-stat-label">Especialistas</div>
            </div>
          </div>
        </div>

        {/* CAROUSEL */}
        <div className="kn-carousel">
          <div
            className="kn-carousel-track"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {SLIDES.map((src, i) => (
              <div className="kn-carousel-slide" key={i}>
                <img src={src} alt={`Slide ${i + 1}`} />
              </div>
            ))}
          </div>

          <div className="kn-carousel-dots">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`kn-dot${currentSlide === i ? " active" : ""}`}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Ir a slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>


      {/* ── PLATAFORMA ── */}
      <section className="kn-platform" id="plataforma">
        <div className="kn-platform-inner kn-fade-in" ref={addFadeRef}>
          <div className="kn-platform-text">
            <div className="kn-section-label">Nuestra plataforma</div>
            <h2 className="kn-section-title">Gestioná tu atención desde donde estés</h2>
            <p>
              A través de nuestra plataforma vas a poder gestionar tus turnos de manera
              simple, rápida y segura, sin necesidad de llamadas ni largas esperas.
            </p>
            <p>
              Nuestro objetivo es ofrecerte una experiencia moderna y práctica que
              facilite tu organización y te permita enfocarte en lo más importante:
              tu salud y tu bienestar.
            </p>
          </div>
          <div className="kn-platform-grid">
            {PLATFORM_FEATURES.map((f, i) => (
              <div className="kn-platform-card" key={i}>
                <div className="kn-platform-icon">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── ABOUT ── */}
      <section className="kn-about" id="about">
        <div className="kn-about-image-stack kn-fade-in" ref={addFadeRef}>
          <img
            src={ImagenCentro}
            alt="Centro Kinescius"
            className="kn-about-img-main"
          />
          <img
            src={KinesiologoRodilla}
            alt="Tratamiento kinesiológico"
            className="kn-about-img-accent"
          />
          <div className="kn-about-card">
            <div className="kn-about-card-num">98%</div>
            <div className="kn-about-card-lbl">satisfacción</div>
          </div>
        </div>

        <div className="kn-about-content kn-fade-in" ref={addFadeRef}>
          <div className="kn-section-label">Quiénes somos</div>
          <h2 className="kn-section-title">
            Más que un centro de kinesiología
          </h2>
          <p>
            Kinescius nació con una misión clara: brindar rehabilitación de
            excelencia a cada persona que atraviesa un proceso de recuperación.
            Desde lesiones deportivas hasta rehabilitación postquirúrgica,
            nuestro equipo multidisciplinario diseña planes personalizados que
            se adaptan a cada cuerpo y cada historia.
          </p>
          <p>
            Contamos con instalaciones de última generación y un equipo de
            kinesiólogos certificados que combinan evidencia científica con un
            trato humano y cercano.
          </p>
          <ul className="kn-values-list">
            {VALUES.map((value, i) => (
              <li key={i}>
                <div className="kn-check-icon">
                  <svg viewBox="0 0 12 12">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                </div>
                {value}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="kn-services" id="servicios">
        <div className="kn-services-header">
          <div>
            <div className="kn-section-label">Especialidades</div>
            <h2 className="kn-section-title">Nuestros servicios</h2>
          </div>
          <p className="kn-section-sub">
            Abordamos cada zona del cuerpo con protocolos específicos, adaptados
            a tu diagnóstico y objetivos de recuperación.
          </p>
        </div>

        <div className="kn-services-grid">
          {SERVICES.map((service, i) => (
            <div
              className="kn-service-card kn-fade-in"
              key={i}
              ref={addFadeRef}
            >
              <div className="kn-service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <div className="kn-cta-band">
        <h2>
          ¿Listo para dar el primer paso hacia tu{" "}
          <span>recuperación</span>?
        </h2>
        <button className="kn-btn-cta-band" onClick={handlePedirTurno}>
          Pedir mi turno ahora →
        </button>
      </div>

      {/* ── MAP ── */}
      <section className="kn-map-section" id="ubicacion">
        <div className="kn-map-header">
          <div className="kn-section-label">Dónde encontrarnos</div>
          <h2 className="kn-section-title">Nuestra ubicación</h2>
          <p className="kn-section-sub">
            Estamos ubicados en el corazón de la ciudad, con fácil acceso en
            transporte público y estacionamiento disponible.
          </p>
        </div>

        <div className="kn-map-container kn-fade-in" ref={addFadeRef}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3284.016848805396!2d-58.38415772346517!3d-34.60373597295296!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bccacf0f272b2b%3A0x9dba26f59f79f04f!2sAv.%20Corrientes%201000%2C%20Buenos%20Aires!5e0!3m2!1ses!2sar!4v1714000000000!5m2!1ses!2sar"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación Kinescius"
          />
        </div>

        <div className="kn-map-info">
          <div className="kn-map-info-card kn-fade-in" ref={addFadeRef}>
            <div className="kn-map-info-icon">📍</div>
            <div>
              <h4>Dirección</h4>
              <p>
                Av. Corrientes 1000
                <br />
                Buenos Aires, Argentina
              </p>
            </div>
          </div>
          <div className="kn-map-info-card kn-fade-in" ref={addFadeRef}>
            <div className="kn-map-info-icon">🕐</div>
            <div>
              <h4>Horario de atención</h4>
              <p>
                Lun – Vie: 8:00 a 20:00
                <br />
                Sábados: 9:00 a 14:00
              </p>
            </div>
          </div>
          <div className="kn-map-info-card kn-fade-in" ref={addFadeRef}>
            <div className="kn-map-info-icon">📞</div>
            <div>
              <h4>Contacto</h4>
              <p>
                +54 11 4000-0000
                <br />
                info@kinescius.com.ar
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="kn-footer">
        <div className="kn-footer-top">
          <div className="kn-footer-brand">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div className="kn-nav-logo">
                <img src={Logo} alt="Logo Kinescius" />
              </div>
              <span className="kn-footer-brand-name">KINESCIUS</span>
            </div>
            <p>
              Centro de Rehabilitación Integral. Recuperamos tu movimiento,
              devolvemos tu vida.
            </p>
          </div>

          <div className="kn-footer-links">
            <h5>Servicios</h5>
            <ul>
              <li><a href="#servicios">Rehabilitación Deportiva</a></li>
              <li><a href="#servicios">Kinesiología Neurológica</a></li>
              <li><a href="#servicios">Pilates Terapéutico</a></li>
              <li><a href="#servicios">Terapia Manual</a></li>
            </ul>
          </div>

          <div className="kn-footer-links">
            <h5>Centro</h5>
            <ul>
              <li><a href="#about">Quiénes somos</a></li>
              <li><a href="#ubicacion">Ubicación</a></li>
              <li>
                <a href="/login" onClick={(e) => { e.preventDefault(); handlePedirTurno(); }}>
                  Pedir turno
                </a>
              </li>
            </ul>
          </div>

          <div className="kn-footer-links">
            <h5>Acceso</h5>
            <ul>
              <li><a href="/login">Iniciar sesión</a></li>
              <li><a href="/register">Registrarse</a></li>
            </ul>
          </div>

          <div className="kn-footer-links">
            <h5>Redes sociales</h5>
            <div className="kn-footer-socials">
              <a
                href="https://www.instagram.com/kinescius"
                target="_blank"
                rel="noopener noreferrer"
                className="kn-social-link"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
                @kinescius
              </a>
              <a
                href="https://www.facebook.com/kinescius"
                target="_blank"
                rel="noopener noreferrer"
                className="kn-social-link"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
                @kinescius
              </a>
            </div>
          </div>
        </div>

        <div className="kn-footer-bottom">
          <span>
            © 2026 Kinescius Centro de Rehabilitación. Todos los derechos
            reservados.
          </span>
          <span>Hecho con 💚 para el bienestar de nuestros pacientes</span>
        </div>
      </footer>
    </div>
  );
}