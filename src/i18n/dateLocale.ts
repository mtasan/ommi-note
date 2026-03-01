import i18n from "./index";
import { tr } from "date-fns/locale/tr";
import { enUS } from "date-fns/locale/en-US";

export function getDateLocale() {
  return i18n.language === "tr" ? tr : enUS;
}
