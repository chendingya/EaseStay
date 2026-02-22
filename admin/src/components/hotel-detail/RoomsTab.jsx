import RoomsTabBase from '../hotel-shared/RoomsTabBase'

export default function RoomsTab(props) {
  return (
    <RoomsTabBase
      {...props}
      i18nPrefix="hotelDetail.room"
      emptyTextKey="hotelDetail.emptyRooms"
      promoFallbackKey="hotelDetail.promo.fallback"
      showStatusColumn={false}
      showActionColumn
      actionSetKey="hotelDetail.room.setDiscount"
      actionCancelKey="hotelDetail.room.cancelDiscount"
      wifiYesKey="hotelDetail.room.wifiYes"
      wifiNoKey="hotelDetail.room.wifiNo"
      breakfastYesKey="hotelDetail.room.breakfastYes"
      breakfastNoKey="hotelDetail.room.breakfastNo"
    />
  )
}
