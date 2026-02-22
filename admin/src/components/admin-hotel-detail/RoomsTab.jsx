import RoomsTabBase from '../hotel-shared/RoomsTabBase'

export default function RoomsTab(props) {
  return (
    <RoomsTabBase
      {...props}
      i18nPrefix="adminHotelDetail.room"
      emptyTextKey="adminHotelDetail.emptyRooms"
      promoFallbackKey="adminHotelDetail.room.promoFallback"
      showStatusColumn
      showActionColumn={false}
      wifiYesKey="common.yes"
      wifiNoKey="common.no"
      breakfastYesKey="common.yes"
      breakfastNoKey="common.no"
    />
  )
}
