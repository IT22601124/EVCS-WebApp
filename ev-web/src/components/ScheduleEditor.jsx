import { useEffect, useMemo } from "react";

function RowActions({ onDuplicate, onRemove }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onDuplicate}
        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">Duplicate</button>
      <button type="button" onClick={onRemove}
        className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs">Remove</button>
    </div>
  );
}

export default function ScheduleEditor({
  slots, setSlots,
  canEdit = true,
}) {
  const totalCap = useMemo(
    () => (slots || []).reduce((sum, s) => sum + (Number(s.capacity) || 0), 0),
    [slots]
  );

  const addRow = () =>
    setSlots([
      ...slots,
      { start: "08:00", end: "09:00", available: true, capacity: 1 },
    ]);

  const duplicateLast = () => {
    if (!slots.length) return addRow();
    const last = slots[slots.length - 1];
    setSlots([...slots, { ...last }]);
  };

  const update = (i, patch) =>
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const remove = (i) => setSlots(slots.filter((_, idx) => idx !== i));

  useEffect(() => {
    if (!slots?.length) addRow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div className="font-semibold">Time Slots</div>
        <div className="text-sm text-slate-500">Total capacity: <b>{totalCap}</b></div>
      </div>

      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Start</th>
                <th className="px-3 py-2 text-left">End</th>
                <th className="px-3 py-2 text-center">Available</th>
                <th className="px-3 py-2 text-center">Capacity</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      disabled={!canEdit}
                      value={s.start}
                      onChange={(e) => update(i, { start: e.target.value })}
                      type="time"
                      className="border rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      disabled={!canEdit}
                      value={s.end}
                      onChange={(e) => update(i, { end: e.target.value })}
                      type="time"
                      className="border rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <label className="inline-flex items-center gap-2">
                      <input
                        disabled={!canEdit}
                        type="checkbox"
                        checked={!!s.available}
                        onChange={(e) => update(i, { available: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <span className="text-xs text-slate-600">Open</span>
                    </label>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      disabled={!canEdit}
                      value={s.capacity}
                      onChange={(e) => update(i, { capacity: Math.max(1, Number(e.target.value || 1)) })}
                      type="number" min={1}
                      className="border rounded px-2 py-1 w-20 text-center"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canEdit && (
                      <RowActions
                        onDuplicate={() => duplicateLast()}
                        onRemove={() => remove(i)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={addRow}
              className="px-3 py-2 rounded bg-slate-900 text-white text-sm hover:bg-slate-800">
              + Add Row
            </button>
            <button type="button" onClick={duplicateLast}
              className="px-3 py-2 rounded bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
              Copy Last Row
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
