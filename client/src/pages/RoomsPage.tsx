import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Room } from '../types';
import {
  Building2,
  Plus,
  BedDouble,
  Wind,
  UserCheck,
  UserX,
  Search,
} from 'lucide-react';

interface RoomsPageProps {
  onOpenNewRoom: () => void;
  onOpenCheckInForBed: (bedId: string) => void;
  onOpenCheckOut: (occupancyData: any) => void;
}

export const RoomsPage: React.FC<RoomsPageProps> = ({
  onOpenNewRoom,
  onOpenCheckInForBed,
  onOpenCheckOut,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addingBedToRoomId, setAddingBedToRoomId] = useState<string | null>(null);
  const [newBedName, setNewBedName] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRooms();
      setRooms(data.rooms);
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleAddBedSubmit = async (roomId: string) => {
    if (!newBedName.trim()) return;
    try {
      await api.addBed(roomId, newBedName.trim());
      setAddingBedToRoomId(null);
      setNewBedName('');
      fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to add bed to room');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = r.number.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'AC') return r.hasAc;
    if (filterType === 'NON_AC') return !r.hasAc;
    if (filterType === 'AVAILABLE') return r.availableBeds > 0;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Accommodation Units & Bed Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain room capacity, track individual bed statuses, and enforce single-resident bed limits.
          </p>
        </div>
        <button
          onClick={onOpenNewRoom}
          className="inline-flex items-center px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Unit
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search unit identifier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Units' },
            { id: 'AVAILABLE', label: 'Vacant Beds' },
            { id: 'AC', label: 'AC' },
            { id: 'NON_AC', label: 'Non-AC' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterType === f.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></div>
          <p className="mt-2 text-xs">Loading unit inventory...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs">
          {error}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-700">No accommodation units found</p>
          <p className="text-[11px] text-slate-400 mt-1">Adjust search parameters or click "Add Unit" to create a new room.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const isFull = room.availableBeds === 0;

            return (
              <div
                key={room.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-slate-900">
                          Unit {room.number}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Floor {room.floor}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        {room.type.replace('_', ' ').toLowerCase()} sharing • ₹{room.baseRent.toLocaleString('en-IN')}/mo
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {room.hasAc ? (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          <Wind className="w-3 h-3 mr-1 text-slate-500" /> AC
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-500">
                          Non-AC
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isFull
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isFull ? 'Occupied' : `${room.availableBeds} bed(s) free`}
                      </span>
                    </div>
                  </div>

                  {/* Bed Allocation List */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Bed Slots ({room.beds.length})
                    </span>

                    {room.beds.map((bed) => {
                      const isOccupied = bed.status === 'OCCUPIED' && bed.currentOccupant;

                      return (
                        <div
                          key={bed.id}
                          className={`p-2.5 rounded-lg border text-xs ${
                            isOccupied
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-white border-dashed border-slate-300 text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <BedDouble
                                className={`w-3.5 h-3.5 ${
                                  isOccupied ? 'text-slate-700' : 'text-slate-400'
                                }`}
                              />
                              <span className="font-semibold text-slate-900">{bed.name}</span>
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                                  isOccupied
                                    ? 'bg-slate-200 text-slate-800'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {isOccupied ? 'Assigned' : 'Vacant'}
                              </span>
                            </div>

                            {/* Action Button */}
                            {isOccupied ? (
                              <button
                                onClick={() =>
                                  onOpenCheckOut({
                                    occupancyId: bed.currentOccupant!.occupancyId,
                                    tenantName: bed.currentOccupant!.name,
                                    roomNumber: room.number,
                                    bedName: bed.name,
                                    checkInDate: bed.currentOccupant!.checkInDate,
                                    monthlyRent: bed.currentOccupant!.monthlyRent,
                                    securityDeposit: 0,
                                  })
                                }
                                className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center cursor-pointer"
                              >
                                <UserX className="w-3 h-3 mr-1" />
                                Move-Out
                              </button>
                            ) : (
                              <button
                                onClick={() => onOpenCheckInForBed(bed.id)}
                                className="text-[11px] font-medium text-slate-900 hover:underline flex items-center cursor-pointer"
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Assign
                              </button>
                            )}
                          </div>

                          {isOccupied && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 text-[11px] text-slate-600 flex justify-between items-center">
                              <div>
                                <span className="font-medium text-slate-900">
                                  {bed.currentOccupant!.name}
                                </span>
                                {bed.currentOccupant!.phone && (
                                  <span className="text-slate-400 ml-1">({bed.currentOccupant!.phone})</span>
                                )}
                              </div>
                              <span className="text-slate-400 text-[10px]">
                                Since {new Date(bed.currentOccupant!.checkInDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Bed Inline Form */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {addingBedToRoomId === room.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Bed label (e.g. Bed C)"
                        value={newBedName}
                        onChange={(e) => setNewBedName(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddBedSubmit(room.id)}
                        className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingBedToRoomId(null);
                          setNewBedName('');
                        }}
                        className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingBedToRoomId(room.id)}
                      className="w-full py-1 text-center text-xs text-slate-500 hover:text-slate-900 font-medium hover:bg-slate-50 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Bed Slot
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
