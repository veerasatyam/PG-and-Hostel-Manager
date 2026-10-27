import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { RoomsPage } from './pages/RoomsPage';
import { TenantsPage } from './pages/TenantsPage';
import { RentPage } from './pages/RentPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { TenantPortalPage } from './pages/TenantPortalPage';

// Modals
import { CheckInModal } from './components/CheckInModal';
import { CheckOutModal } from './components/CheckOutModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { NewComplaintModal } from './components/NewComplaintModal';
import { NewRoomModal } from './components/NewRoomModal';

export const App: React.FC = () => {
  const { user, loading } = useAuth();

  // Tab State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [filterTenantId, setFilterTenantId] = useState<string | null>(null);

  // Modal States
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInDefaultBedId, setCheckInDefaultBedId] = useState<string | undefined>(undefined);

  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [checkOutOccupancyData, setCheckOutOccupancyData] = useState<any>(null);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentRentRecord, setPaymentRentRecord] = useState<any>(null);

  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  const [isNewComplaintOpen, setIsNewComplaintOpen] = useState(false);
  const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);

  // Refresh key to force reload components after mutations
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-3 text-xs font-semibold tracking-wider uppercase text-slate-500">
            Loading StayHaven...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isOwner = user.role === 'OWNER';

  // Modal Triggers
  const handleOpenCheckIn = (bedId?: string) => {
    setCheckInDefaultBedId(bedId);
    setIsCheckInOpen(true);
  };

  const handleOpenCheckOut = (occupancyData: any) => {
    setCheckOutOccupancyData(occupancyData);
    setIsCheckOutOpen(true);
  };

  const handleOpenPayment = (rentRecord: any) => {
    setPaymentRentRecord(rentRecord);
    setIsPaymentOpen(true);
  };

  const handleOpenReceipt = (recNum: string) => {
    setReceiptNumber(recNum);
  };

  const handleViewRentHistory = (tenantId: string) => {
    setFilterTenantId(tenantId);
    setCurrentTab('rent');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setFilterTenantId(null);
          setCurrentTab(tab);
        }}
      />

      <main className="pb-16">
        {isOwner ? (
          <>
            {currentTab === 'dashboard' && (
              <DashboardPage
                key={`dash-${refreshKey}`}
                onOpenCheckIn={() => handleOpenCheckIn()}
                onOpenNewRoom={() => setIsNewRoomOpen(true)}
                onOpenPayment={handleOpenPayment}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}
            {currentTab === 'rooms' && (
              <RoomsPage
                key={`rooms-${refreshKey}`}
                onOpenNewRoom={() => setIsNewRoomOpen(true)}
                onOpenCheckInForBed={(bedId) => handleOpenCheckIn(bedId)}
                onOpenCheckOut={handleOpenCheckOut}
              />
            )}
            {currentTab === 'tenants' && (
              <TenantsPage
                key={`tenants-${refreshKey}`}
                onOpenCheckIn={() => handleOpenCheckIn()}
                onOpenCheckOut={handleOpenCheckOut}
                onViewRentHistory={handleViewRentHistory}
              />
            )}
            {currentTab === 'rent' && (
              <RentPage
                key={`rent-${refreshKey}`}
                onOpenPayment={handleOpenPayment}
                onOpenReceipt={handleOpenReceipt}
                filterTenantId={filterTenantId}
              />
            )}
            {currentTab === 'complaints' && (
              <ComplaintsPage
                key={`comp-${refreshKey}`}
                onOpenNewComplaint={() => setIsNewComplaintOpen(true)}
              />
            )}
          </>
        ) : (
          /* Tenant Portal View */
          <>
            {(currentTab === 'portal' || currentTab === 'dashboard') && (
              <TenantPortalPage
                key={`tenant-portal-${refreshKey}`}
                onOpenNewComplaint={() => setIsNewComplaintOpen(true)}
                onOpenReceipt={handleOpenReceipt}
              />
            )}
            {currentTab === 'complaints' && (
              <ComplaintsPage
                key={`tenant-comp-${refreshKey}`}
                onOpenNewComplaint={() => setIsNewComplaintOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onSuccess={triggerRefresh}
        defaultBedId={checkInDefaultBedId}
      />

      <CheckOutModal
        isOpen={isCheckOutOpen}
        onClose={() => {
          setIsCheckOutOpen(false);
          setCheckOutOccupancyData(null);
        }}
        onSuccess={triggerRefresh}
        occupancyData={checkOutOccupancyData}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setPaymentRentRecord(null);
        }}
        onSuccess={(recNumber) => {
          triggerRefresh();
          setReceiptNumber(recNumber);
        }}
        rentRecord={paymentRentRecord}
      />

      <ReceiptModal
        receiptNumber={receiptNumber}
        onClose={() => setReceiptNumber(null)}
      />

      <NewComplaintModal
        isOpen={isNewComplaintOpen}
        onClose={() => setIsNewComplaintOpen(false)}
        onSuccess={triggerRefresh}
      />

      <NewRoomModal
        isOpen={isNewRoomOpen}
        onClose={() => setIsNewRoomOpen(false)}
        onSuccess={triggerRefresh}
      />
    </div>
  );
};
