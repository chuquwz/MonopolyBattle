"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { vi } from "@/i18n/vi";
import { apiRequest } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import { SocketProvider } from "@/providers/socket-provider";
import { useSocket } from "@/hooks/use-socket";
import { useGameStore } from "@/stores/game.store";
import { useUiStore } from "@/stores/ui.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameLayout } from "@/components/layout/game-layout";
import { SOCKET_EVENTS } from "@monopoly/shared";
import { DecisionPanel } from "@/components/game/decision-panel";
import { EventOverlay } from "@/components/game/event-overlay";
import { NarratorBox } from "@/components/game/narrator-box";
import { AnimatePresence } from "framer-motion";
import { TeamStats } from "@/components/game/team-stats";
import { MarketShareChart } from "@/components/game/market-share-chart";
import { Leaderboard } from "@/components/game/leaderboard";
import { QuizModal } from "@/components/quiz/quiz-modal";

function PlayerGameContent() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [loading, setLoading] = React.useState(true);

  // Subscribe to specific Zustand store slices
  const roomCode = useGameStore((s) => s.roomCode);
  const phase = useGameStore((s) => s.phase);
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const roundTimeLeft = useGameStore((s) => s.roundTimeLeft);
  const myTeam = useGameStore((s) => s.myTeam);
  const allTeams = useGameStore((s) => s.allTeams);
  const availableDecisions = useGameStore((s) => s.availableDecisions);
  const selectedDecision = useGameStore((s) => s.selectedDecision);
  const currentEvent = useGameStore((s) => s.currentEvent);
  const narration = useGameStore((s) => s.narration);
  const activeQuiz = useGameStore((s) => s.activeQuiz);
  const leaderboard = useGameStore((s) => s.leaderboard);

  // Sync initial full state from REST API on mount
  React.useEffect(() => {
    const fetchInitialState = async () => {
      const gameId = localStorage.getItem(STORAGE_KEYS.GAME_ID);
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!gameId || !token) {
        router.push("/play/join");
        return;
      }

      const response = await apiRequest<any>(`/api/games/${gameId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data) {
        // Sync full state to store
        useGameStore.getState().syncFullState({
          roomCode: response.data.game.roomCode,
          role: "player",
          phase: response.data.game.status as any,
          currentRound: response.data.game.currentRound,
          totalRounds: response.data.game.totalRounds,
          myTeam: response.data.myTeam,
          allTeams: response.data.allTeams,
        });
      }
      setLoading(false);
    };

    fetchInitialState();
  }, [router]);

  // Handle decisions submission
  const handleSelectDecision = (decisionType: string) => {
    if (!socket || !isConnected || !myTeam) return;

    // Set local selection
    useGameStore.setState({ selectedDecision: decisionType });

    // Emit to server using defined Socket event constants
    socket.emit(SOCKET_EVENTS.PLAYER_DECISION, {
      roundId: "current",
      teamId: myTeam.id,
      decisionType,
    });

    useUiStore.getState().addToast({
      title: "Đã gửi quyết định",
      description: `Quyết định "${decisionType}" đã được ghi nhận.`,
      variant: "success",
    });
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm animate-pulse">{vi.ui.loading.loading}</p>
      </div>
    );
  }

  // If game is in finished state, show the scoreboard overlay
  if (phase === "finished") {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <Badge className="bg-accent/10 text-accent border border-accent/25 uppercase px-4 py-1 tracking-widest text-[10px] font-bold">
            GAME OVER
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            {vi.pages.results.title}
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {vi.pages.results.subtitle}
          </p>
        </div>

        <Card className="border-border bg-card/40 backdrop-blur shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center justify-between">
              <span>{vi.pages.results.leaderboardTitle}</span>
              <Badge variant="outline" className="border-border font-mono text-xs">
                {roomCode}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm leading-relaxed">
                Đang tổng hợp điểm số từ ban tổ chức...
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((item, idx) => {
                  const isOwnTeam = item.teamId === myTeam?.id;
                  return (
                    <div
                      key={item.teamId}
                      className={`p-4 rounded-lg border flex items-center justify-between transition-colors ${isOwnTeam ? 'bg-accent/10 border-accent/50 shadow-md' : 'bg-background/40 border-border'}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black font-mono text-sm ${idx === 0 ? 'bg-accent text-slate-950 shadow-lg' : idx === 1 ? 'bg-muted text-muted-foreground' : idx === 2 ? 'bg-amber-700 text-foreground' : 'bg-secondary text-muted-foreground'}`}>
                          {item.rank}
                        </span>
                        <div>
                          <h4 className="font-bold text-foreground/90 text-sm flex items-center gap-2">
                            {item.teamName}
                            {isOwnTeam && <Badge variant="default" className="text-[9px] px-1.5 py-0.5">BẠN</Badge>}
                          </h4>
                          <span className="text-[10px] text-muted-foreground block">Thị phần: {item.marketShare}% | Rủi ro: {item.monopolyRisk}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-accent font-mono">{item.totalScore.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground block">điểm</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center border-t border-border pt-6">
            <Button
              onClick={() => {
                localStorage.clear();
                router.push("/");
              }}
              variant="outline"
              className="border-border hover:bg-secondary hover:text-foreground font-bold"
            >
              Quay lại Trang chủ
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Active game play view
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Main Grid split */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left/Middle area: Dynamic Game Action Components based on Active Phase */}
        <div className="lg:col-span-2 space-y-6">
          {/* Phase 1: Decisions Selection */}
          {phase === "decision" && <DecisionPanel />}

          {/* Phase 2: Events Narrative / Overlay */}
          {phase === "event" && (
            <Card className="border-border bg-card/40 backdrop-blur shadow-xl relative overflow-hidden">
              <CardHeader>
                <Badge variant="destructive" className="w-fit text-[9px] font-extrabold tracking-widest uppercase">
                  SỰ KIỆN PHÁT SINH
                </Badge>
                <CardTitle className="text-xl font-bold mt-2">
                  {currentEvent ? currentEvent.titleVi : "Đang chờ công bố sự kiện..."}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                  {currentEvent ? currentEvent.descriptionVi : "Thị trường đang có những biến động phức tạp. Quản trò đang xử lý..."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Phase 3: Narrator message / Edu content */}
          {phase === "narration" && (
            <Card className="border-border bg-card/40 backdrop-blur shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  Báo cáo thị trường & Giáo dục kinh tế
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-background/60 border border-border">
                  <p className="text-sm text-foreground/90 leading-relaxed italic">
                    "{narration.text || "Đang phân tích các tác động từ quyết định kinh doanh của các đội..."}"
                  </p>
                </div>
                {narration.type === "education" && (
                  <div className="p-3 rounded border border-primary/25 bg-primary/5 text-xs text-muted-foreground">
                    💡 <strong>Bài học kinh tế:</strong> Cơ cấu độc quyền nhóm có xu hướng cản trở sự gia nhập thị trường của đối thủ mới và làm giảm phúc lợi người tiêu dùng.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Phase 4: Quiz session */}
          {phase === "quiz" && (
            <Card className="border-border bg-card/40 backdrop-blur shadow-xl select-none">
              <CardHeader className="text-center">
                <Badge className="bg-primary/10 text-muted-foreground border border-primary/25 w-fit text-[9px] font-extrabold uppercase mx-auto">
                  THỬ THÁCH TRẮC NGHIỆM
                </Badge>
                <CardTitle className="text-lg font-bold mt-3">
                  {vi.quiz.modalTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-300 animate-pulse">
                  {vi.quiz.waitingOthers}
                </p>
                <p className="text-xs text-muted-foreground">
                  Bảng trắc nghiệm kiến thức đang hiển thị phía trên. Vui lòng hoàn thành câu trả lời của bạn.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Phase 5: Intermediate results */}
          {phase === "results" && (
            <Card className="border-border bg-card/40 backdrop-blur shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Báo cáo kết quả Vòng {currentRound}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Thống kê kết quả kinh doanh và thị phần sau các chiến dịch đầu tư.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed text-center py-12">
                  Quản trò đang tính toán tài chính, thị phần và điểm tích lũy của vòng chơi này. Vui lòng chờ...
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right area: Team metrics & competitors stats lists */}
        <div className="space-y-6">
          {/* Team Stats Panel */}
          <TeamStats />

          {/* Market Share Visualization Chart */}
          <MarketShareChart />

          {/* Current Rankings Leaderboard */}
          <Leaderboard />
        </div>
      </div>

      {/* Real-time Event Overlay and AI Narrator Box */}
      <AnimatePresence mode="wait">
        <EventOverlay />
      </AnimatePresence>

      <AnimatePresence>
        <NarratorBox />
      </AnimatePresence>

      <AnimatePresence>
        <QuizModal />
      </AnimatePresence>
    </div>
  );
}

export default function GamePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const gameId = localStorage.getItem(STORAGE_KEYS.GAME_ID);
    const role = localStorage.getItem(STORAGE_KEYS.ROLE);

    if (!token || !gameId || role !== "player") {
      router.push("/play/join");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return null;
  }

  return (
    <SocketProvider>
      <GameLayout>
        <PlayerGameContent />
      </GameLayout>
    </SocketProvider>
  );
}
