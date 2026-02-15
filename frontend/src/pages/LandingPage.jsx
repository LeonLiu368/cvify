import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="landing">
      <h1 className="landing-brand">CVified</h1>
      <p className="landing-tagline">Computer vision games in the browser.</p>
      <ul className="game-list" aria-label="Games">
        <li>
          <article className="game-card">
            <h3 className="game-card-title">SnakeCV</h3>
            <p className="game-card-desc">
              Classic Snake controlled by your face. Use head movement or
              keyboard to steer. Play with your camera on.
            </p>
            <Link to="/games/snake" className="game-card-cta primary">
              Play SnakeCV
            </Link>
          </article>
        </li>
        <li>
          <article className="game-card">
            <h3 className="game-card-title">Slither</h3>
            <p className="game-card-desc">
              Continuous snake: grow by eating pellets, avoid bodies and walls.
              Bot mode only for now.
            </p>
            <Link to="/games/slither" className="game-card-cta primary">
              Play Slither
            </Link>
          </article>
        </li>
      </ul>
    </div>
  )
}
