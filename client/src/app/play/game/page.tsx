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
import { Progress } from "@/components/ui/progress";
import { GameLayout } from "@/components/layout/game-layout";
import { SOCKET_EVENTS } from "@monopoly/shared";

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

  // Handle quiz answer submission
  const handleAnswerQuiz = (optionIdx: number) => {
    if (!socket || !isConnected || !myTeam || !activeQuiz) return;

    // Set local answered state
    useGameStore.setState({
      activeQuiz: {
        ...activeQuiz,
        answered: true,
      },
    });

    // Emit to server using defined Socket event constants
    socket.emit(SOCKET_EVENTS.PLAYER_QUIZ_ANSWER, {
      roundId: "current",
      teamId: myTeam.id,
      questionId: "current", // Active question ID tracked by server engine
      selectedOption: optionIdx,
      timeTakenMs: 1500, // Simulated time
    });

    useUiStore.getState().addToast({
      title: "Đã trả lời câu hỏi",
      description: "Câu trả lời của bạn đã được gửi lên hệ thống.",
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

  const myTeamFromAll = allTeams.find((t) => t.id === myTeam?.id);
  const myTeamNumber = myTeamFromAll?.teamNumber || 0;

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
          {phase === "decision" && (
            <Card className="border-border bg-card/40 backdrop-blur shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">{vi.pages.playGame.decisionsPanelTitle}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Hãy thảo luận cùng đồng đội và chọn 1 chiến lược kinh doanh cho vòng này. Quyết định không thể sửa đổi sau khi đã chọn.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableDecisions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    Không có quyết định nào khả dụng trong vòng này. Đang chờ server...
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {availableDecisions.map((decision) => {
                      const isSelected = selectedDecision === decision.type;
                      return (
                        <button
                          key={decision.type}
                          onClick={() => handleSelectDecision(decision.type)}
                          disabled={!!selectedDecision}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-40 ${isSelected ? 'border-accent bg-accent/10 shadow-lg' : 'border-border bg-background/40 hover:border-slate-700 hover:bg-card/40'}`}
                        >
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              Quyết định
                            </span>
                            <h4 className="font-extrabold text-foreground/90 text-sm leading-tight">
                              {decision.nameVi || decision.type}
                            </h4>
                            <p className="text-[11px] text-muted-foreground line-clamp-3 mt-1 leading-normal font-medium">
                              {decision.descriptionVi}
                            </p>
                          </div>
                          <Badge variant={isSelected ? "default" : "outline"} className="text-[9px] w-fit">
                            {isSelected ? "Đã chọn" : "Chi phí: " + decision.cost.toLocaleString() + " $"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
            <Card className="border-border bg-card/40 backdrop-blur shadow-xl">
              <CardHeader>
                <Badge className="bg-primary/10 text-muted-foreground border border-primary/25 w-fit text-[9px] font-extrabold uppercase">
                  THỬ THÁCH TRẮC NGHIỆM
                </Badge>
                <CardTitle className="text-lg font-bold mt-2">
                  {activeQuiz ? activeQuiz.question : "Đang tải câu hỏi trắc nghiệm..."}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeQuiz ? (
                  <div className="grid gap-3">
                    {activeQuiz.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswerQuiz(idx)}
                        disabled={activeQuiz.answered}
                        className={`p-4 rounded-lg border text-left transition-all text-xs font-bold ${activeQuiz.answered ? 'bg-background/30 border-border text-muted-foreground' : 'bg-background/60 border-border text-foreground hover:border-accent hover:bg-card/40'}`}
                      >
                        <span className="text-accent font-mono mr-2">{String.fromCharCode(65 + idx)}.</span>
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">Chưa có thử thách trắc nghiệm nào hoạt động.</p>
                )}
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
          {/* Own Team HUD Card */}
          <Card className="border-border bg-card/60 backdrop-blur shadow-xl">
            <CardHeader className="border-b border-border pb-4">
              <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                Đội chơi
              </CardDescription>
              <CardTitle className="text-2xl font-black text-foreground flex items-center gap-2">
                <span className="text-accent font-mono">#{myTeamNumber}</span>
                {myTeam?.name || "Đang tải..."}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Money */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-bold uppercase">{vi.stats.money}</span>
                <span className="font-extrabold text-foreground/90">
                  {(myTeam?.money ?? 0).toLocaleString()} {vi.stats.moneyUnit}
                </span>
              </div>

              {/* Market Share */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold leading-none">
                  <span className="text-muted-foreground uppercase">{vi.stats.marketShare}</span>
                  <span className="text-foreground/95">{myTeam?.marketShare || 0}%</span>
                </div>
                <Progress value={myTeam?.marketShare || 0} className="h-1.5" />
              </div>

              {/* Technology */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-bold uppercase">{vi.stats.technology}</span>
                <span className="font-extrabold text-foreground/90">{myTeam?.technology || 0}</span>
              </div>

              {/* Reputation */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-bold uppercase">{vi.stats.reputation}</span>
                <span className="font-extrabold text-foreground/90">{myTeam?.reputation || 0}</span>
              </div>

              {/* Monopoly Risk */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold leading-none">
                  <span className="text-muted-foreground uppercase">{vi.stats.monopolyRisk}</span>
                  <span className="text-monopoly-risk font-bold">{myTeam?.monopolyRisk || 0}%</span>
                </div>
                <Progress value={myTeam?.monopolyRisk || 0} className="h-1.5 bg-monopoly-risk/20" indicatorColor="bg-monopoly-risk" />
              </div>
            </CardContent>
          </Card>

          {/* Competitors List */}
          <Card className="border-border bg-card/40 backdrop-blur shadow-xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-sm font-bold">Đối thủ cạnh tranh</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 max-h-[300px] overflow-y-auto">
              {allTeams.filter((t) => t.id !== myTeam?.id).length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-6">Không có đối thủ cạnh tranh nào trong phòng.</p>
              ) : (
                <div className="space-y-3">
                  {allTeams
                    .filter((t) => t.id !== myTeam?.id)
                    .map((team) => (
                      <div
                        key={team.id}
                        className="p-3 rounded border border-border bg-background/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <h5 className="font-bold text-foreground/80">#{team.teamNumber} {team.name}</h5>
                          <span className="text-[9px] text-muted-foreground block">Thị phần: {team.marketShare}%</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground">
                          {team.status === "ready" ? "Sẵn sàng" : "Chờ..."}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
