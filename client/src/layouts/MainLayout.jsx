import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import MobileNav from '../components/common/MobileNav';
import Toast from '../components/common/Toast';
import AddTransactionModal from '../components/transactions/AddTransactionModal';
import RepayModal from '../components/lending/RepayModal';

const MainLayout = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState('income');
  const [modalPrefillContact, setModalPrefillContact] = useState(null);

  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [activeRepayRelationship, setActiveRepayRelationship] = useState(null);

  const openAddModal = (type = 'income', contact = null) => {
    setModalInitialType(type);
    setModalPrefillContact(contact);
    setIsAddModalOpen(true);
  };

  const openRepayModal = (relationship) => {
    setActiveRepayRelationship(relationship);
    setIsRepayModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      <Toast />
      <Navbar onOpenAddModal={() => openAddModal('income')} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-x-hidden">
          <Outlet
            context={{
              openAddModal,
              openRepayModal,
            }}
          />
        </main>
      </div>

      <MobileNav />

      {/* Global Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialType={modalInitialType}
        prefillContact={modalPrefillContact}
        onSuccess={() => {
          // Handled via Socket and context refresh
        }}
      />

      <RepayModal
        isOpen={isRepayModalOpen}
        onClose={() => setIsRepayModalOpen(false)}
        relationship={activeRepayRelationship}
        onSuccess={() => {
          // Handled via Socket and context refresh
        }}
      />
    </div>
  );
};

export default MainLayout;
