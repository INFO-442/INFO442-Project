import { Link } from 'react-router'
import navbarCSS from './Navbar.module.css'

function Navbar() {
  return (
    <div className={navbarCSS.navbar}>
      <Link to="/">Dashboard</Link>
      <Link to="/feedback">Feedback</Link>
      <Link to="/questions">Questions</Link>
      <Link to="/settings">Settings</Link>
      <Link to="/login">Login</Link>
      <Link to="/signup">Sign up</Link>
    </div>
  )
}

export default Navbar
