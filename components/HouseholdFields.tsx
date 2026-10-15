import { PLANNING_ROLES, EVENT_ROLES } from '@/lib/constants';

export default function HouseholdFields({ h = {} as any, includeEmail = false }: { h?: any; includeEmail?: boolean }) {
  const planning: string[] = h.volunteer_planning || [];
  const event: string[] = h.volunteer_event || [];
  return (
    <>
      <fieldset>
        <legend>Your household</legend>
        <div className="form-grid">
          <label className="field">Household name<input type="text" name="name" required defaultValue={h.name || ''} placeholder="e.g., The Reed Household" /></label>
          <label className="field">Main contact<input type="text" name="contact_name" defaultValue={h.contact_name || ''} /></label>
          <label className="field">Phone<input type="tel" name="phone" defaultValue={h.phone || ''} /></label>
          {includeEmail && <label className="field">Email<input type="email" name="email" defaultValue={h.email || ''} /></label>}
          <label className="field">City and state<input type="text" name="city_state" defaultValue={h.city_state || ''} /></label>
          <label className="field">Your Banks ancestor
            <input type="text" name="ancestor" defaultValue={h.ancestor || ''} placeholder="Which Banks sibling you descend from" />
            <span className="hint">Not sure? Write what you know. We'll piece it together.</span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Who's coming</legend>
        <div className="form-grid-sm">
          <label className="field">Adults (18+)<input type="number" min={0} name="adults" defaultValue={h.adults ?? 0} /></label>
          <label className="field">Teens (13 to 17)<input type="number" min={0} name="teens" defaultValue={h.teens ?? 0} /></label>
          <label className="field">Kids (3 to 12)<input type="number" min={0} name="kids" defaultValue={h.kids ?? 0} /></label>
          <label className="field">Little ones (under 3)<input type="number" min={0} name="infants" defaultValue={h.infants ?? 0} /></label>
        </div>
        <label className="field">Food restrictions or allergies<textarea rows={3} name="food_notes" defaultValue={h.food_notes || ''} placeholder="e.g., one shellfish allergy, two vegetarians" /></label>
        <label className="field">Accessibility needs<textarea rows={2} name="access_notes" defaultValue={h.access_notes || ''} placeholder="e.g., wheelchair access, no stairs, seating near restrooms" /></label>
        <label className="check"><input type="checkbox" name="keep_private" defaultChecked={!!h.keep_private} />Keep my food and accessibility details private (planners only)</label>
      </fieldset>

      <fieldset>
        <legend>Lend a hand</legend>
        <p className="muted">Check anything you'd be willing to lead or help with.</p>
        <div className="form-grid">
          <div>
            <div className="bold" style={{ color: 'var(--brown)', marginBottom: 6 }}>Planning</div>
            {PLANNING_ROLES.map((r) => (
              <label key={r} className="check"><input type="checkbox" name="planning" value={r} defaultChecked={planning.includes(r)} />{r}</label>
            ))}
          </div>
          <div>
            <div className="bold" style={{ color: 'var(--brown)', marginBottom: 6 }}>Reunion weekend</div>
            {EVENT_ROLES.map((r) => (
              <label key={r} className="check"><input type="checkbox" name="event" value={r} defaultChecked={event.includes(r)} />{r}</label>
            ))}
          </div>
        </div>
        <label className="field">Anything else you'd like to lead?<input type="text" name="volunteer_other" defaultValue={h.volunteer_other || ''} /></label>
      </fieldset>
    </>
  );
}
