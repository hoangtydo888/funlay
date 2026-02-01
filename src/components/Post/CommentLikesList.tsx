import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LikeUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  channel_id?: string;
}

interface CommentLikesListProps {
  commentId: string;
  likeCount: number;
  children: React.ReactNode;
}

export const CommentLikesList: React.FC<CommentLikesListProps> = ({
  commentId,
  likeCount,
  children
}) => {
  const [users, setUsers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchLikers = async () => {
    if (hasLoaded || likeCount === 0) return;
    
    setLoading(true);
    try {
      // Fetch users who liked this comment
      const { data: likes, error: likesError } = await supabase
        .from('post_comment_likes')
        .select('user_id')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (likesError) throw likesError;

      if (likes && likes.length > 0) {
        const userIds = likes.map(l => l.user_id);
        
        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Fetch channel IDs for each user
        const { data: channels, error: channelsError } = await supabase
          .from('channels')
          .select('id, user_id')
          .in('user_id', userIds);

        if (channelsError) throw channelsError;

        // Map profiles with channel IDs
        const usersWithChannels = profiles?.map(profile => ({
          ...profile,
          channel_id: channels?.find(c => c.user_id === profile.id)?.id
        })) || [];

        setUsers(usersWithChannels);
      }
      setHasLoaded(true);
    } catch (error) {
      console.error('Error fetching likers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (likeCount === 0) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild onMouseEnter={fetchLikers}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-64 p-3" 
        side="top" 
        align="start"
        sideOffset={8}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 text-sm font-medium text-foreground border-b border-border/50 pb-2">
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span>{likeCount} người thích</span>
          </div>

          {/* User list */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {users.map((user) => {
                const displayName = user.display_name || user.username;
                return (
                  <Link
                    key={user.id}
                    to={user.channel_id ? `/channel/${user.channel_id}` : '#'}
                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatar_url || undefined} alt={displayName} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground/90 group-hover:text-primary transition-colors truncate">
                      {displayName}
                    </span>
                  </Link>
                );
              })}
              
              {likeCount > 10 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <Users className="h-3.5 w-3.5" />
                  <span>và {likeCount - 10} người khác</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Không có dữ liệu</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
