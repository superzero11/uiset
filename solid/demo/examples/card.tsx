import { Button } from "../../src/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../src/card"

export default function CardExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pro plan</CardTitle>
        <CardDescription>$20 per seat, monthly.</CardDescription>
      </CardHeader>
      <CardContent>5 of 10 seats used.</CardContent>
      <CardFooter>
        <Button>Add seats</Button>
      </CardFooter>
    </Card>
  )
}
