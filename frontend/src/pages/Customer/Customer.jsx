import customerCSS from './Customer.module.css'
import { useParams } from 'react-router'

function CustomerPage() {
  const business = useParams().business;
  return (
    <div className={customerCSS.customerPage}>Customer page of business: {business}</div>
  )
}

export default CustomerPage
