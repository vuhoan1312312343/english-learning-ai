import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import { LEVELS } from '../../lib/admin-config';
import { adminApi } from '../../lib/api';

const UNITS_PER_PAGE = 8;

type LevelCode = (typeof LEVELS)[number];

type LevelDetail = {
  code: LevelCode;
  name: string;
  description: string;
};

type UnitItem = {
  _id: string;
  unitNumber: number;
  description: string;
  level: LevelCode;
};

type LevelDetailResponse = {
  level: LevelDetail;
  units: UnitItem[];
  selectedUnitNumbers: number[];
};

export default function LevelDetailPage() {
  const router = useRouter();
  const { level } = router.query;

  const [levelData, setLevelData] = useState<LevelDetail | null>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [selectedUnitNumbers, setSelectedUnitNumbers] = useState<number[]>([]);
  const selectedUnitNumbersRef = useRef<number[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingUnits, setSavingUnits] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentLevel = useMemo(() => {
    if (typeof level !== 'string') return null;
    const upper = level.toUpperCase() as LevelCode;
    return LEVELS.includes(upper) ? upper : null;
  }, [level]);

  const loadDetail = async (code: LevelCode) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.get(`/api/admin/levels/${code}`);
      const payload = response.data as LevelDetailResponse;
      setLevelData(payload.level);
      setUnits(payload.units ?? []);
      const nextSelectedUnitNumbers = payload.selectedUnitNumbers ?? [];
      selectedUnitNumbersRef.current = nextSelectedUnitNumbers;
      setSelectedUnitNumbers(nextSelectedUnitNumbers);
      setNameInput(payload.level.name ?? '');
      setDescriptionInput(payload.level.description ?? '');
      setPage(1);
    } catch {
      setError('Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    if (!currentLevel) {
      void router.replace('/levels');
      return;
    }

    void loadDetail(currentLevel);
  }, [router.isReady, currentLevel, router]);

  const saveLevelInfo = async () => {
    if (!currentLevel) return;
    setError(null);
    setMessage(null);
    try {
      await adminApi.patch(`/api/admin/levels/${currentLevel}`, {
        name: nameInput,
        description: descriptionInput,
      });
      setMessage('Da luu thong tin level.');
      await loadDetail(currentLevel);
    } catch {
      setError('Luu thong tin level that bai.');
    }
  };

  const assignUnitToLevel = async (unitNumber: number) => {
    setSelectedUnitNumbers((prev) => {
      const next = prev.includes(unitNumber)
        ? prev.filter((num) => num !== unitNumber)
        : [...prev, unitNumber];
      selectedUnitNumbersRef.current = next;
      return next;
    });
  };

  const filteredUnits = useMemo(() => {
    const sortedUnits = [...units].sort((a, b) => {
      const aIsCurrent = currentLevel ? a.level === currentLevel : false;
      const bIsCurrent = currentLevel ? b.level === currentLevel : false;

      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      return a.unitNumber - b.unitNumber;
    });

    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return sortedUnits;
    return sortedUnits.filter((unit) => {
      const haystack = `unit ${unit.unitNumber} ${unit.description} ${unit.level}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [units, searchText, currentLevel]);

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

  const saveUnitSelection = async () => {
    if (!currentLevel || savingUnits) return;
    setError(null);
    setMessage(null);
    setSavingUnits(true);

    const selectedSnapshot = [...selectedUnitNumbersRef.current];
    const fallbackLevel = currentLevel === 'A1' ? 'A2' : 'A1';

    try {
      await adminApi.patch(`/api/admin/levels/${currentLevel}/units`, {
        unitNumbers: selectedSnapshot,
        fallbackLevel,
      });
      setMessage(`Da cap nhat danh sach unit cho ${currentLevel}.`);
      await loadDetail(currentLevel);
    } catch {
      setError('Cap nhat danh sach unit that bai.');
    } finally {
      setSavingUnits(false);
    }
  };

  return (
    <AdminShell
      title={`Edit Level ${currentLevel ?? ''}`}
      subtitle=""
    >
      <section className="card admin-section">
        <Link href="/levels" className="btn btn-secondary" style={{ display: 'inline-flex', marginBottom: 12 }}>
          Back
        </Link>

        {loading ? (
          <div className="muted">Loading</div>
        ) : levelData ? (
          <div className="admin-level-detail-layout">
            <div className="card surface-soft admin-level-info-panel">
              <div
                className={`admin-level-detail-circle admin-level-detail-circle-${levelData.code.toLowerCase()}`}
                style={{
                    width: "80%",
                    height: "40%",
                    aspectRatio: "1 / 1",
                    fontSize: "5.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%"
                }}
                >
                {levelData.code}
                </div>

              <label>
                <span className="admin-level-field-label">Level</span>
                <input className="input admin-level-field-input" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
              </label>

              <label>
                <span className="admin-level-field-label" style={{ marginTop: "40px", display: "block" }}>
                    Description
                </span>

                <textarea
                  className="input admin-level-field-input"
                  rows={4}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                />
              </label>

              <button className="btn btn-primary admin-level-save-btn" onClick={() => void saveLevelInfo()}>
                Save
              </button>
            </div>

            <div className="card surface-soft">
              

              <div className="admin-level-units-toolbar">
                <input
                  className="input admin-level-units-search"
                  placeholder="Search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <div className="admin-level-units-actions">
                  <span className="muted">{page}/{totalPages}</span>
                  <button className="btn btn-primary" disabled={savingUnits} onClick={() => void saveUnitSelection()}>
                    {savingUnits ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="split" style={{ marginBottom: 10 }}>
                <h2 className="section-title" style={{ margin: 2 }}>Units list</h2>
                <span className="chip">{selectedUnitNumbers.length} units o {levelData.code}</span>
              </div>

              <div className="admin-level-unit-grid">
                {pagedUnits.map((unit) => {
                  const selected = selectedUnitNumbers.includes(unit.unitNumber);
                  return (
                    <button
                      key={unit._id}
                      className={`admin-level-unit-card ${selected ? 'is-selected' : ''}`}
                      onClick={() => void assignUnitToLevel(unit.unitNumber)}
                    >
                      <div className="admin-level-unit-title">Unit {unit.unitNumber}</div>
                      <div className="muted admin-level-unit-desc">{unit.description}</div>
                      <div className="admin-level-unit-badges">
                        <span className="chip">Current: {unit.level}</span>
                        {selected ? <span className="chip">Selected</span> : <span className="chip">Not selected</span>}
                      </div>
                    </button>
                  );
                })}
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
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
