import { useState, useEffect } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import AuthScreen from './components/AuthScreen';
import ProfileSetup from './components/ProfileSetup';
import Layout, { type Tab } from './components/Layout';
import ChatRoom from './components/ChatRoom';
import MediaVault from './components/MediaVault';
import ProfilePage from './components/ProfilePage';
import RewardsPage from './components/RewardsPage';
import AdminPanel from './components/AdminPanel';
import GamesHub from './components/GamesHub';
import FeedPage from './components/FeedPage';
import GroupsPage from './components/GroupsPage';
import MarketplacePage from './components/MarketplacePage';
import DirectMessagesPage from './components/DirectMessagesPage';
import QuizzesPage from './components/QuizzesPage';
import AdminModal from './components/AdminModal';
import { supabase } from './lib/supabase';

function AppInner() {
  const { user, loading, setUser } = useUser();
  const [hasSession, setHasSession] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setHasSession(true);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-royal-gradient flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasSession && !user) {
    return <AuthScreen onAuthSuccess={() => setHasSession(true)} />;
  }

  if (!user || !user.name) {
    return <ProfileSetup onComplete={(u) => setUser(u)} />;
  }

  if (user.is_banned) {
    return (
      <div className="min-h-screen bg-royal-gradient flex items-center justify-center p-6">
        <div className="glow-card rounded-3xl p-8 text-center max-w-md animate-slide-up">
          <h2 className="text-2xl font-bold text-cream mb-2">Account Suspended</h2>
          <p className="text-slate-400">Your account has been banned by a moderator. Please contact an admin.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAdminTrigger={() => setShowAdminModal(true)}
      >
        {activeTab === 'chat' && <ChatRoom />}
        {activeTab === 'feed' && <FeedPage />}
        {activeTab === 'groups' && <GroupsPage />}
        {activeTab === 'messages' && <DirectMessagesPage />}
        {activeTab === 'vault' && <MediaVault />}
        {activeTab === 'marketplace' && <MarketplacePage />}
        {activeTab === 'quizzes' && <QuizzesPage />}
        {activeTab === 'games' && <GamesHub />}
        {activeTab === 'rewards' && <RewardsPage />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'admin' && user.is_admin && <AdminPanel />}
      </Layout>

      {showAdminModal && <AdminModal onClose={() => setShowAdminModal(false)} />}
    </>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppInner />
    </UserProvider>
  );
}
