import { Navbar } from "@/components/layout/Navbar";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, GraduationCap, CalendarDays, Coins, MessageSquare, Heart, Repeat2 } from "lucide-react";
import { Link } from "wouter";
import { useAppGetUser, useAppGetUserPosts } from "@/hooks/use-app-data";
import { SafeContent } from "@/components/ui/safe-content";
import { getCurrentHandle } from "@/lib/auth";

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:handle");
  const handle = params?.handle || "";
  
  const currentUser = getCurrentHandle();
  const { data: user, isLoading } = useAppGetUser(handle);
  const { data: posts, isLoading: postsLoading } = useAppGetUserPosts(handle, currentUser);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-8 px-4">
        {isLoading ? (
          <div className="h-64 bg-muted/50 animate-pulse rounded-2xl mb-8"></div>
        ) : user ? (
          <>
            <div className="bg-card border rounded-3xl overflow-hidden shadow-sm mb-8">
              <div className="h-32 bg-primary/20 w-full relative">
                <div className="absolute -bottom-16 left-8">
                  <Avatar className="h-32 w-32 border-4 border-card bg-muted">
                    <AvatarImage src={user.avatarUrl || ""} />
                    <AvatarFallback className="text-4xl">{user.displayName?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="pt-20 px-8 pb-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">{user.displayName ?? "Unknown"}</h1>
                    <p className="text-muted-foreground text-lg">@{user.handle ?? "unknown"}</p>
                  </div>
                  <Button variant="outline" className="rounded-full">Edit Profile</Button>
                </div>
                
                <p className="text-lg mb-6 max-w-2xl">{user.bio || "No bio yet."}</p>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1"><GraduationCap className="w-4 h-4" /> {user.university ?? "N/A"}</div>
                  <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {user.town ?? "N/A"}</div>
                  <div className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</div>
                </div>

                <div className="flex flex-wrap gap-8 py-4 border-t border-b">
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{user.followersCount ?? 0}</span> 
                    <span className="text-sm text-muted-foreground uppercase tracking-wider">Followers</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{user.followingCount ?? 0}</span> 
                    <span className="text-sm text-muted-foreground uppercase tracking-wider">Following</span>
                  </div>
                  <div className="flex flex-col ml-auto text-right">
                    <span className="font-bold text-2xl text-primary flex items-center gap-2 justify-end">
                      <Coins className="w-6 h-6" /> {user.weixBucks?.toLocaleString()}
                    </span> 
                    <span className="text-sm text-muted-foreground uppercase tracking-wider">WeixBucks</span>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">Posts</h2>
            
            {postsLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-40 bg-muted/50 rounded-xl"></div>
                <div className="h-40 bg-muted/50 rounded-xl"></div>
              </div>
            ) : Array.isArray(posts) && posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map(post => (
                  <Card key={post.id} className="hover:bg-muted/30 transition-colors border-border/50 shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-start gap-4">
                      <Avatar className="h-12 w-12 cursor-pointer">
                        <AvatarImage src={post.authorAvatarUrl || ""} />
                        <AvatarFallback>{post.authorDisplayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="font-bold">{post.authorDisplayName}</span>
                          <Link href={`/posts/${post.id}`}>
                            <span className="text-xs text-muted-foreground hover:underline">{new Date(post.createdAt).toLocaleDateString()}</span>
                          </Link>
                        </CardTitle>
                        <div className="text-sm text-muted-foreground flex gap-2 items-center mt-1">
                          <span>@{post.authorHandle}</span>
                          <span>•</span>
                          <span className="text-primary font-medium">{post.townTag}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pl-20 pb-2">
                       <SafeContent text={post.content} className="text-[17px]" />
                    </CardContent>
                    <CardFooter className="pl-20 pt-2 flex gap-6 text-sm text-muted-foreground border-none">
                      <Link href={`/posts/${post.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 hover:text-primary hover:bg-primary/10 gap-2">
                          <MessageSquare className="w-4 h-4" /> {post.repliesCount}
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:text-green-500 hover:bg-green-500/10 gap-2">
                        <Repeat2 className="w-4 h-4" /> {post.repostsCount}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:text-destructive hover:bg-destructive/10 gap-2">
                        <Heart className={`w-4 h-4 ${post.liked ? 'fill-current text-destructive' : ''}`} /> {post.likesCount}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                No posts yet.
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">Profile not found.</div>
        )}
      </main>
    </div>
  );
}
