import { useState } from 'react';
import JoinRoom from '@/components/JoinRoom';
import Whiteboard from '@/components/Whiteboard';

const Index = () => {
  const [session, setSession] = useState<{ name: string; roomId: string } | null>(null);

  if (!session) {
    return <JoinRoom onJoin={(name, roomId) => setSession({ name, roomId })} />;
  }

  return (
    <Whiteboard
      userName={session.name}
      roomId={session.roomId}
      onLeave={() => setSession(null)}
    />
  );
};

export default Index;
