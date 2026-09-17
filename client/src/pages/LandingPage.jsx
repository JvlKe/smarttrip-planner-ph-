import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Icon from "../components/Icon";
import ThemeToggle from "../components/ThemeToggle";

const features = [
  {
    icon: "spark",
    title: "AI itinerary builder",
    description:
      "Describe your dream trip, set your budget, and shape an editable day-by-day plan.",
  },
  {
    icon: "pin",
    title: "Interactive travel map",
    description:
      "See routes, attractions, and saved stops together on an OpenStreetMap view.",
  },
  {
    icon: "trips",
    title: "Trip management",
    description:
      "Keep schedules, estimated budgets, notes, and travel tools in one organized place.",
  },
];

const steps = [
  ["Create account", "Sign up in a minute"],
  ["Choose a destination", "Pick your Philippine escape"],
  ["Build your itinerary", "Use AI or plan it yourself"],
  ["Start the adventure", "Travel with your plan ready"],
];

const destinations = [
  {
    name: "Palawan",
    description: "Lagoons and limestone islands",
    days: "4 days",
    image: "/assets/palawan-hero.webp",
    imageAlt: "Turquoise lagoon surrounded by limestone cliffs in Palawan",
    position: "center",
  },
  {
    name: "Boracay",
    description: "White sand and island sunsets",
    days: "3 days",
    image: "/assets/boracay-white-beach.jpg",
    imageAlt: "White Beach and turquoise water in Boracay",
    position: "center 58%",
  },
  {
    name: "Batanes",
    description: "Rolling hills and Ivatan culture",
    days: "5 days",
    image: "/assets/batanes-rolling-hills.jpg",
    imageAlt: "Vayang rolling hills overlooking the sea in Batanes",
    position: "center 58%",
  },
  {
    name: "Siargao",
    description: "Surf breaks and island roads",
    days: "4 days",
    image: "/assets/siargao-island.jpg",
    imageAlt: "Surfer walking through coconut palms on Siargao Island",
    position: "center 54%",
  },
];

export default function LandingPage() {
  return (
    <main className="marketing-page">
      <header className="marketing-header">
        <div className="marketing-container marketing-nav">
          <BrandLogo />
          <nav aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#destinations">Destinations</a>
          </nav>
          <div className="marketing-nav-actions">
            <ThemeToggle />
            <Link className="fresh-button fresh-button-outline" to="/login">
              Sign in
            </Link>
            <Link className="fresh-button fresh-button-orange" to="/register">
              Register
            </Link>
          </div>
          <div className="marketing-mobile-actions">
            <ThemeToggle />
            <Link className="marketing-mobile-signin" to="/login">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="marketing-hero" id="home">
        <div className="marketing-container hero-layout">
          <div className="hero-copy-fresh">
            <span className="fresh-eyebrow">
              <Icon name="spark" size={14} /> AI travel planner
            </span>
            <h1>
              Plan your perfect <em>Philippine adventure</em>
            </h1>
            <p>
              Build a personalized trip around your destinations, dates,
              estimated budget, and travel style - across every island of the
              Philippines.
            </p>
            <div className="fresh-hero-actions">
              <Link
                className="fresh-button fresh-button-orange fresh-button-large"
                to="/register"
              >
                <Icon name="plane" size={18} /> Get started free
              </Link>
              <Link
                className="fresh-button fresh-button-outline fresh-button-large"
                to="/login"
              >
                Sign in
              </Link>
            </div>
            <Link className="marketing-existing-account" to="/login">
              Already have an account? Sign in <span aria-hidden="true">→</span>
            </Link>
            <div className="fresh-trust" aria-label="SmartTrip benefits">
              <span>
                <Icon name="check" size={14} /> Free to use
              </span>
              <span>
                <Icon name="check" size={14} /> AI-assisted
              </span>
              <span>
                <Icon name="check" size={14} /> Built for the Philippines
              </span>
            </div>
          </div>

          <div className="fresh-hero-media">
            <img
              src="/assets/palawan-hero.webp"
              alt="Aerial view of a turquoise Palawan lagoon and limestone cliffs"
            />
            <span className="fresh-eyebrow hero-image-badge">
              <Icon name="spark" size={14} /> AI travel planner
            </span>
            <article className="fresh-place-card">
              <div>
                <small>FEATURED ESCAPE</small>
                <strong>Palawan Island</strong>
                <span aria-label="Rated 4.8 out of 5">
                  ★★★★★ <b>4.8</b>
                </span>
              </div>
              <span className="fresh-place-days">4 days</span>
            </article>
          </div>
        </div>
      </section>

      <section className="marketing-features" id="features">
        <div className="marketing-container">
          <h2 className="mobile-section-title">Why SmartTrip?</h2>
          <div className="fresh-feature-grid">
            {features.map((feature) => (
              <article key={feature.title}>
                <span className="fresh-icon-tile">
                  <Icon name={feature.icon} />
                </span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-steps" id="how-it-works">
        <div className="marketing-container">
          <h2>How SmartTrip works</h2>
          <div className="fresh-step-grid">
            {steps.map(([title, description], index) => (
              <article key={title}>
                <span>{index + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <Link
            className="fresh-button fresh-button-orange fresh-step-cta"
            to="/register"
          >
            <Icon name="plane" size={17} /> Plan my trip now
          </Link>
        </div>
      </section>

      <section className="marketing-destinations" id="destinations">
        <div className="marketing-container">
          <div className="fresh-section-heading">
            <div>
              <h2>Explore top destinations</h2>
              <p>Discover handpicked places for your next getaway.</p>
            </div>
            <Link
              className="fresh-button fresh-button-outline desktop-destination-link"
              to="/register"
            >
              View all destinations <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="fresh-destination-grid">
            {destinations.map((destination) => (
              <article className="fresh-destination-card" key={destination.name}>
                <div className="fresh-destination-photo">
                  <img
                    src={destination.image}
                    alt={destination.imageAlt}
                    loading="lazy"
                    style={{ objectPosition: destination.position }}
                  />
                  <span>{destination.days}</span>
                </div>
                <div>
                  <h3>{destination.name}</h3>
                  <p>{destination.description}</p>
                </div>
              </article>
            ))}
          </div>
          <Link
            className="fresh-button fresh-button-outline mobile-destination-link"
            to="/register"
          >
            View all destinations <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <footer className="marketing-footer">
        <div className="marketing-container fresh-footer-grid">
          <div className="fresh-footer-brand">
            <BrandLogo inverse />
            <p>
              Your travel companion for planning thoughtful Philippine
              adventures.
            </p>
            <div className="fresh-socials" aria-label="Social links">
              <span>f</span>
              <span>◎</span>
              <span>◉</span>
            </div>
          </div>
          <div>
            <h3>Product</h3>
            <a href="#features">Features</a>
            <a href="#destinations">Destinations</a>
            <Link to="/register">Create a trip</Link>
          </div>
          <div>
            <h3>Company</h3>
            <a href="#home">About SmartTrip</a>
            <a href="#how-it-works">How it works</a>
          </div>
          <div>
            <h3>Support</h3>
            <Link to="/login">Help center</Link>
            <a href="mailto:support@example.com">Contact</a>
          </div>
        </div>
        <div className="marketing-container fresh-footer-bottom">
          <span>© 2026 SmartTrip Planner PH</span>
          <span className="fresh-photo-credits">
            Photos: <a href="https://commons.wikimedia.org/wiki/File:White_beach_on_boracay_island.jpg">Boracay</a>,{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Vayang_Rolling_Hills,_Batanes,_Philippines.jpg">Batanes</a>, and{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Siargao_Island.jpg">Siargao</a> · Made for Philippine adventures
          </span>
        </div>
      </footer>
    </main>
  );
}
