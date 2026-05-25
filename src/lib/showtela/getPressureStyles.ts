import type { PressureLevel } from './types'

export function getPressureStyles(pressure?: PressureLevel) {
  switch (pressure) {
    case 'critical':
      return {
        badge: 'border-[#A63F2F] bg-[#F8DDD7] text-[#7E291D]',
        dot: '#B43F2C',
        panel: 'border-[#E7B3A8] bg-[linear-gradient(160deg,#FFF7F4_0%,#F8E0DA_100%)]',
      }
    case 'high':
      return {
        badge: 'border-[#C27A4B] bg-[#F8E8DA] text-[#8D4F22]',
        dot: '#D08245',
        panel: 'border-[#E9D0B7] bg-[linear-gradient(160deg,#FFF9F2_0%,#F6E6D5_100%)]',
      }
    case 'medium':
      return {
        badge: 'border-[#C3A15A] bg-[#F5ECCE] text-[#7A6022]',
        dot: '#C89B2F',
        panel: 'border-[#E8DCC4] bg-[linear-gradient(152deg,#FFFDF7_0%,#F6EBDD_100%)]',
      }
    case 'low':
    default:
      return {
        badge: 'border-[#9CB09C] bg-[#EAF3EA] text-[#476247]',
        dot: '#6C8B6C',
        panel: 'border-[#DCE7DA] bg-[linear-gradient(152deg,#FEFFFD_0%,#EFF4EA_100%)]',
      }
  }
}
