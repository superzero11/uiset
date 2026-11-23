// The Address kit's web page: an address whose fields follow its country, checked on Save.
import { toast } from "@ui-sdk/web"
import "./uiset"
import { countryName } from "@/registry/uiset/ui/address/address"
import type { UISetAddressFields } from "./uiset"

const form = document.getElementById("form") as HTMLFormElement
const address = document.getElementById("address") as UISetAddressFields

address.preferredCountries = ["US", "CA", "GB"]
form.addEventListener("submit", (event) => {
  event.preventDefault()
  if (address.check()) toast(`Address saved, in ${countryName(address.value.country)}.`)
})
