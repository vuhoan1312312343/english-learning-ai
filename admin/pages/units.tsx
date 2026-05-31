import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../components/AdminShell';
import { LEVELS, SECTION_OPTIONS } from '../lib/admin-config';
import { adminApi } from '../lib/api';
import { UnitItem } from '../lib/admin-types';

const UNITS_PER_PAGE = 8;

export default function UnitsPage() {
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [selectedUnitNumber, setSelectedUnitNumber] = useState<number | null>(null);
  const [selectedUnitDescription, setSelectedUnitDescription] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedUnitLevel, setSelectedUnitLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUnits = async () => {
    try {
      const response = await adminApi.get('/api/admin/units');
      setUnits(response.data.units ?? []);
      setError(null);
    } catch {
      setUnits([]);
      setError('Khong the tai units. Kiem tra backend va NEXT_PUBLIC_API_URL.');
    }
  };

  useEffect(() => {
    void loadUnits();
  }, []);

  useEffect(() => {
    if (selectedUnitNumber || units.length === 0) return;
    const firstUnit = [...units].sort((a, b) => a.unitNumber - b.unitNumber)[0];
    setSelectedUnitNumber(firstUnit.unitNumber);
  }, [units, selectedUnitNumber]);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.unitNumber === selectedUnitNumber) ?? null,
    [units, selectedUnitNumber],
  );

  const filteredUnits = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const sorted = [...units].sort((a, b) => a.unitNumber - b.unitNumber);
    if (!keyword) return sorted;
    return sorted.filter((unit) => {
      const haystack = `unit ${unit.unitNumber} ${unit.description} ${unit.level}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [units, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / UNITS_PER_PAGE));

  const pagedUnits = useMemo(() => {
    const start = (page - 1) * UNITS_PER_PAGE;
    return filteredUnits.slice(start, start + UNITS_PER_PAGE);
  }, [filteredUnits, page]);

  useEffect(() => {
    setPage(1);
  }, [searchText]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!selectedUnit) {
      setSelectedUnitDescription('');
      return;
    }

    setSelectedUnitLevel(selectedUnit.level);
    setSelectedUnitDescription(selectedUnit.description ?? '');

    const nextSections: string[] = [];
    for (const tile of [...selectedUnit.tiles].sort((a, b) => a.order - b.order)) {
      if (tile.type === 'dumbbell') nextSections.push('practice');
      else if (tile.type === 'trophy') nextSections.push('unit-review');
      else if (tile.description?.toLowerCase().includes('vocabulary')) nextSections.push('vocabulary');
      else if (tile.description?.toLowerCase().includes('reading')) nextSections.push('reading');
      else if (tile.description?.toLowerCase().includes('speaking')) nextSections.push('speaking');
      else if (tile.description?.toLowerCase().includes('writing')) nextSections.push('writing');
      else if (tile.description?.toLowerCase().includes('grammar')) nextSections.push('grammar-focus');
    }
    setSelectedSections(Array.from(new Set(nextSections)));
  }, [selectedUnit]);

  useEffect(() => {
    if (!selectedUnitNumber) return;
    const exists = units.some((unit) => unit.unitNumber === selectedUnitNumber);
    if (!exists) {
      setSelectedUnitNumber(null);
      setSelectedSections([]);
    }
  }, [units, selectedUnitNumber]);

  useEffect(() => {
    if (pagedUnits.length === 0) return;
    const selectedIsVisible = pagedUnits.some((unit) => unit.unitNumber === selectedUnitNumber);
    if (!selectedIsVisible) {
      setSelectedUnitNumber(pagedUnits[0].unitNumber);
    }
  }, [pagedUnits, selectedUnitNumber]);

  const saveUnitConfig = async () => {
    if (!selectedUnitNumber) return;
    setError(null);
    setMessage(null);

    if (selectedSections.length === 0) {
      setError('Vui long chon it nhat 1 section de luu.');
      return;
    }

    if (!selectedUnitDescription.trim()) {
      setError('Vui long nhap ten unit.');
      return;
    }

    try {
      await adminApi.patch(`/api/admin/units/${selectedUnitNumber}`, {
        level: selectedUnitLevel,
        description: selectedUnitDescription.trim(),
      });
      await adminApi.patch(`/api/admin/units/${selectedUnitNumber}/sections`, {
        sections: selectedSections,
      });
      await loadUnits();
      setMessage('Saved.');
    } catch {
      setError('Error');
    }
  };

  return (
    <AdminShell title="Units" subtitle="">

      <section className="card admin-section">
        <div className="admin-units-layout">
          

          <div className="card surface-soft">
            <div className="admin-level-units-toolbar">
              <div className="admin-units-toolbar-left">
                <input
                  className="input admin-level-units-search"
                  placeholder="Search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <div className="admin-level-units-actions">
                <span className="muted">{page}/{totalPages}</span>
                <span className="chip">{filteredUnits.length} units</span>
              </div>
            </div>

            <div className="split" style={{ marginBottom: 10 }}>
              <h2 className="section-title" style={{ margin: 2 }}>Units list</h2>
              {selectedUnitNumber ? <span className="chip">Edit Unit {selectedUnitNumber}</span> : null}
            </div>

            {message ? <div className="alert alert-success" style={{ marginBottom: 10 }}>{message}</div> : null}
            {error ? <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div> : null}

            <div className="admin-level-unit-grid">
              {pagedUnits.map((unit) => (
                <button
                  key={unit._id}
                  className={`admin-level-unit-card ${selectedUnitNumber === unit.unitNumber ? 'is-selected' : ''}`}
                  onClick={() => setSelectedUnitNumber(unit.unitNumber)}
                >
                  <div className="admin-level-unit-title">Unit {unit.unitNumber}</div>
                  <div className="muted admin-level-unit-desc">{unit.description}</div>
                  <div className="admin-level-unit-badges">
                    <span className="chip">Current: {unit.level}</span>
                    {selectedUnitNumber === unit.unitNumber ? <span className="chip">Selected</span> : <span className="chip">Click to edit</span>}
                  </div>
                </button>
              ))}
            </div>

            <div className="admin-level-unit-pagination">
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                Prev
              </button>
              <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                Next
              </button>
            </div>
          </div>

          <div className="card surface-soft admin-unit-info-panel">
            <label>
              <input
                className="input admin-level-field-input"
                value={selectedUnitDescription}
                onChange={(e) => setSelectedUnitDescription(e.target.value)}
                placeholder={selectedUnitNumber ? '' : ''}
                disabled={!selectedUnitNumber}
              />
            </label>

            <label>
                <span
                    className="admin-level-field-label"
                    style={{ marginTop: "30px", display: "block" }}
                    >
                    Level
                </span>
              <select
                className="input admin-level-field-input"
                value={selectedUnitLevel}
                onChange={(e) => setSelectedUnitLevel(e.target.value as typeof selectedUnitLevel)}
                disabled={!selectedUnitNumber}
                title={selectedUnitNumber ? 'Chon level cho unit nay' : 'Hay chon mot unit ben trai truoc'}
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </label>

            {selectedUnit ? (
              <>
                <div className="section-check-grid">
                  {SECTION_OPTIONS.map((section) => (
                    <label key={section.key} className="section-check">
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections((prev) => [...prev, section.key]);
                          } else {
                            setSelectedSections((prev) => prev.filter((x) => x !== section.key));
                          }
                        }}
                      />
                      <span>{section.label}</span>
                    </label>
                  ))}
                </div>

                <button className="btn btn-primary admin-level-save-btn" style={{ marginTop: 12 }} onClick={() => void saveUnitConfig()}>
                  Save
                </button>
              </>
            ) : (
              <div className="muted" style={{ marginTop: 14 }}></div>
            )}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
