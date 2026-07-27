import { useState } from "react";

export function TrustBadge({ item, grounding, compact = false }) {
  const [open, setOpen] = useState(false);
  if (grounding !== "source") return null;

  const labels = {
    verified: "✓ Verified",
    partial: "≈ Close match",
    unverified: "⚠ Not found in your notes",
  };

  return (
    <span className={`trust-badge-wrap verification-${item.verification}`}>
      <button
        type="button"
        className="trust-badge"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {compact ? labels[item.verification]?.split(" ")[0] : labels[item.verification]}
      </button>
      {open && (
        <span className="evidence-popover">
          <strong>Evidence from your notes</strong>
          <q>{item.evidence || "No supporting quote was returned."}</q>
        </span>
      )}
    </span>
  );
}
