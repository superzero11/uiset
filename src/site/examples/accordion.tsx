import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/registry/uiset/ui/accordion"

export default function AccordionExample() {
  return (
    <Accordion aria-label="Questions">
      <AccordionItem value="billing">
        <AccordionHeader>
          <AccordionTrigger>How does billing work?</AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel>Per seat, monthly. Cancel any time.</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="data">
        <AccordionHeader>
          <AccordionTrigger>Where is my data stored?</AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel>In the region you choose for each project.</AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
}
