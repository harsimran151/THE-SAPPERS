import React, { useState } from 'react';
import { User } from '@/types/whiteboard';
import { Users } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface UserPresenceProps {
  users: User[];
  currentUserId: string;
}

const UserPresence: React.FC<UserPresenceProps> = ({ users, currentUserId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="animate-slide-in">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="glass-toolbar rounded-xl px-3 h-14 flex items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors">
            <Users size={16} className="text-muted-foreground" />
            <div className="flex -space-x-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-card"
                  style={{ backgroundColor: user.color }}
                  title={user.id === currentUserId ? `${user.name} (You)` : user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-mono">{users.length}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Connected Users</h3>
            <div className="space-y-1">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: user.color }}
                  />
                  <span className="text-xs text-foreground">
                    {user.name}
                    {user.id === currentUserId && ' (You)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default UserPresence;
