import OrdersTabBase from '../hotel-shared/OrdersTabBase'

export default function OrdersTab(props) {
  return (
    <OrdersTabBase
      {...props}
      i18nPrefix="hotelDetail.order"
      emptyTextKey="hotelDetail.emptyOrders"
    />
  )
}
