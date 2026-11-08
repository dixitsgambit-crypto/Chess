import { useState } from 'react';
import { EXPRESSIONS, Teacher } from './Teacher';

export function CharacterSheet() {
  const [talking, setTalking] = useState(false);
  return (
    <div className="character-sheet">
      <div className="panel ref">
        <div className="panel-head"><strong>Reference (your upload)</strong></div>
        <p className="small">The reference photo is kept privately and is not published with the site.</p>
        <p className="muted small">
          The in-app teacher is one vector rig drawn from this reference: tight dark curls with faded sides, light-brown skin,
          stubble and goatee, white stud earring, plain white tee, podcast mic. Every lesson uses this same rig, so he always looks the same.
        </p>
      </div>
      <div className="panel">
        <div className="panel-head">
          <strong>Expressions</strong>
          <label className="toggle"><input type="checkbox" checked={talking} onChange={(e) => setTalking(e.target.checked)} /> Talking</label>
        </div>
        <div className="expr-grid">
          {EXPRESSIONS.map((e) => (
            <figure key={e} className="stage-mini">
              <Teacher expression={e} talking={talking} size={210} />
              <figcaption>{e}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
