import { DeadlineCalculator } from "../components/DeadlineCalculator";
import { Section } from "../components/ui";

export function Calculator() {
  return (
    <div className="page narrow">
      <h1>Deadline calculator</h1>
      <p className="muted">
        Counts days the way most courts do (FRCP 6(a)): the trigger day is excluded and a deadline landing on a weekend or court holiday moves to the next
        court day.
      </p>
      <Section title="Calculate">
        <DeadlineCalculator />
      </Section>
    </div>
  );
}
