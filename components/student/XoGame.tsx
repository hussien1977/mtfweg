import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User, XOQuestion, XOGameState, PlayerSymbol, ChatMessage, XOGamePlayer, XOGameSettings } from '../../types.ts';
import { db, firebase } from '../../lib/firebase.ts';
import { Loader2, RefreshCw, Send, Check, X as IconX, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { normalizePathSegment } from '../../lib/utils.ts';

const PLAYER_SYMBOLS: PlayerSymbol[] = ['X', 'O', '⭐', '🌙', '❤️', '🔷'];

interface SquareProps {
  value: PlayerSymbol | null;
  onClick: () => Promise<void>;
  index: number;
  winner: PlayerSymbol | 'draw' | null;
  isDraw: boolean;
}

const Square: React.FC<SquareProps> = ({ value, onClick, index, winner, isDraw }) => (
  <button 
    className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-800 rounded-lg flex items-center justify-center text-6xl font-bold transition-transform transform hover:scale-105 relative group disabled:cursor-not-allowed"
    onClick={onClick}
    disabled={!!value || !!winner || isDraw}
  >
    {value === 'X' && <span className="text-pink-500">X</span>}
    {value === 'O' && <span className="text-cyan-400">O</span>}
    {value === '⭐' && <span className="text-yellow-400">⭐</span>}
    {value === '🌙' && <span className="text-indigo-400">🌙</span>}
    {value === '❤️' && <span className="text-red-500">❤️</span>}
    {value === '🔷' && <span className="text-blue-500">🔷</span>}
    {!value && <span className="absolute top-2 right-3 text-yellow-400 opacity-30 text-2xl font-mono group-hover:opacity-75 transition-opacity">{index + 1}</span>}
  </button>
);

const calculateWinner = (squares: Array<PlayerSymbol | null>) => {
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
  }
  return null;
};

interface XoGameProps {
    currentUser: User;
    gameId: string | null;
    onExit: () => void;
    forceSubject?: { grade: string; subject: string };
}

export default function XoGame({ currentUser, gameId, onExit, forceSubject }: XoGameProps) {
    const [gameState, setGameState] = useState<XOGameState | null>(null);
    const [questionPool, setQuestionPool] = useState<XOQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [chatMessage, setChatMessage] = useState("");
    const [showSymbolPicker, setShowSymbolPicker] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    // Single Player State
    const [localGameState, setLocalGameState] = useState<XOGameState | null>(null);
    const isSinglePlayer = !gameId;
    const activeGameState = isSinglePlayer ? localGameState : gameState;
    const setActiveGameState = isSinglePlayer ? setLocalGameState : setGameState;

    const [schoolIdentifier, setSchoolIdentifier] = useState<string | null>(null);
    const [gameSettings, setGameSettings] = useState<XOGameSettings | null>(null);


    useEffect(() => {
        if (currentUser.principalId) {
            db.ref(`users/${currentUser.principalId}`).get().then(snapshot => {
                const principal = snapshot.val();
                if (principal?.schoolName) {
                    setSchoolIdentifier(normalizePathSegment(principal.schoolName));
                } else {
                    setSchoolIdentifier(currentUser.principalId!); // fallback
                }
            }).catch(() => setSchoolIdentifier(currentUser.principalId!));
        }
    }, [currentUser.principalId]);

    const recordGameResult = async (winner: XOGamePlayer, loser: XOGamePlayer) => {
        if (!gameState || !schoolIdentifier) return;

        const principalId = schoolIdentifier;
        const normalizedGrade = normalizePathSegment(gameState.grade);
        const normalizedSubject = normalizePathSegment(gameState.subject);

        const pointsForWin = 10;
        const updates: Record<string, any> = {};

        // Basic data for winner
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${winner.id}/studentId`] = winner.id;
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${winner.id}/studentName`] = winner.name;
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${winner.id}/classId`] = winner.classId;
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${winner.id}/section`] = winner.section || '';
        updates[`xo_leaderboards/${principalId}/overall/${winner.id}/studentId`] = winner.id;
        updates[`xo_leaderboards/${principalId}/overall/${winner.id}/studentName`] = winner.name;
        
        // Increment winner points
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${winner.id}/points`] = firebase.database.ServerValue.increment(pointsForWin);
        updates[`xo_leaderboards/${principalId}/overall/${winner.id}/totalPoints`] = firebase.database.ServerValue.increment(pointsForWin);
        
        // Basic data for loser
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${loser.id}/studentId`] = loser.id;
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${loser.id}/studentName`] = loser.name;
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${loser.id}/classId`] = loser.classId;
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${loser.id}/section`] = loser.section || '';
        updates[`xo_leaderboards/${principalId}/overall/${loser.id}/studentId`] = loser.id;
        updates[`xo_leaderboards/${principalId}/overall/${loser.id}/studentName`] = loser.name;

        // Increment loser points (by 0 to ensure record exists)
        updates[`xo_leaderboards/${principalId}/subjects/${normalizedGrade}/${normalizedSubject}/scores/${loser.id}/points`] = firebase.database.ServerValue.increment(0);
        updates[`xo_leaderboards/${principalId}/overall/${loser.id}/totalPoints`] = firebase.database.ServerValue.increment(0);
        
        await db.ref().update(updates);
    };

    const handleTimeUp = useCallback(() => {
        if (isSinglePlayer) {
            const current = activeGameState;
            if (current) {
                setLocalGameState({ ...current, currentQuestion: null, xIsNext: !current.xIsNext, questionTimerStart: null });
            }
        } else if (gameId) {
            db.ref(`xo_games/${gameId}`).update({ currentQuestion: null, xIsNext: !gameState?.xIsNext, questionTimerStart: null });
        }
    }, [isSinglePlayer, gameId, activeGameState, gameState]);

    useEffect(() => {
        if (activeGameState?.currentQuestion && activeGameState?.questionTimerStart) {
            const timeLimit = (gameSettings?.questionTimeLimit || 60) * 1000;
            const elapsed = Date.now() - activeGameState.questionTimerStart;
            const remaining = Math.max(0, timeLimit - elapsed);
            
            setTimeLeft(Math.ceil(remaining / 1000));

            const intervalId = setInterval(() => {
                const newElapsed = Date.now() - activeGameState.questionTimerStart!;
                const newRemaining = Math.max(0, timeLimit - newElapsed);
                setTimeLeft(Math.ceil(newRemaining / 1000));

                if (newRemaining === 0) {
                    clearInterval(intervalId);
                    handleTimeUp();
                }
            }, 1000);
            
            return () => clearInterval(intervalId);
        }
    }, [activeGameState?.currentQuestion, activeGameState?.questionTimerStart, gameSettings, handleTimeUp]);

     useEffect(() => {
        if (isSinglePlayer) {
            if (!schoolIdentifier) return;
            setIsLoading(true);
            const grade = forceSubject ? forceSubject.grade : currentUser.stage!;
            const subject = forceSubject ? forceSubject.subject : (currentUser as any).subject;

            if (!grade || !subject) {
                setError("لا يمكن بدء لعبة فردية بدون تحديد المرحلة والمادة.");
                setIsLoading(false);
                return;
            }
            
            const normalizedGrade = normalizePathSegment(grade);
            const normalizedSubject = normalizePathSegment(subject);

            const settingsRef = db.ref(`xo_game_settings/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}`);
            const questionsRef = db.ref(`active_xo_questions/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}`);
            
            Promise.all([settingsRef.get(), questionsRef.get()]).then(([settingsSnap, activeQsSnap]) => {
                const settings = settingsSnap.val();
                setGameSettings(settings);
                const activeIds = activeQsSnap.val();
                
                if (!activeIds || Object.keys(activeIds).length === 0) {
                    throw new Error('لا توجد أسئلة لهذه المادة');
                }
                
                db.ref(`xo_questions/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}`).get().then(qsSnap => {
                    const allQs: XOQuestion[] = Object.values(qsSnap.val() || {});
                    const activeQuestions = allQs.filter(q => activeIds[q.id]);
                    setQuestionPool(activeQuestions.sort(() => 0.5 - Math.random()));
                });
                
                const initialLocalState: XOGameState = {
                    id: 'local', principalId: schoolIdentifier, grade: grade, subject: subject,
                    status: 'in_progress',
                    players: [{ id: currentUser.id, name: currentUser.name, symbol: 'X', classId: currentUser.classId, section: currentUser.section }, { id: 'cpu', name: 'الحاسوب', symbol: 'O' }],
                    board: Array(9).fill(null), xIsNext: true, winner: null,
                    scores: { 'X': 0, 'O': 0, '⭐': 0, '🌙': 0, '❤️': 0, '🔷': 0 },
                    currentQuestion: null, questionForSquare: null, questionTimerStart: null, chat: [], createdAt: Date.now(), updatedAt: Date.now()
                };
                setLocalGameState(initialLocalState);
            }).catch(err => setError(err.message)).finally(() => setIsLoading(false));

        } else if (gameId) {
            setIsLoading(true);
            setError(null);
            setGameState(null); // Reset on game change
            const gameRef = db.ref(`xo_games/${gameId}`);
    
            const listener = gameRef.on('value', snapshot => {
                const data = snapshot.val();

                if (!data) {
                    setGameState(null);
                    setIsLoading(false);
                    return;
                }
                
                if (schoolIdentifier) {
                    const { grade, subject } = data;
                    const normalizedGrade = normalizePathSegment(grade);
                    const normalizedSubject = normalizePathSegment(subject);
                    db.ref(`xo_game_settings/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}`).get().then(settingsSnap => {
                        setGameSettings(settingsSnap.val());
                    });
                }

                if (!data.players || !Array.isArray(data.players)) {
                    setGameState(null); setIsLoading(false); return;
                }
                if (data.players.length === 1) data.players[1] = null;
                if (data.players.length !== 2) {
                    setGameState(null); setIsLoading(false); return;
                }

                const boardFromFb = data.board;
                const newBoard = Array(9).fill(null);
                if (Array.isArray(boardFromFb)) {
                    for(let i=0; i<9; i++) newBoard[i] = boardFromFb[i] || null;
                } else if (typeof boardFromFb === 'object' && boardFromFb !== null) {
                    for (const key in boardFromFb) {
                        const index = parseInt(key, 10);
                        if (!isNaN(index) && index >= 0 && index < 9) {
                            newBoard[index] = boardFromFb[key];
                        }
                    }
                }
                data.board = newBoard;
                
                setGameState(data);
                setIsLoading(false);

            }, (error) => {
                setError(error.message);
                setIsLoading(false);
            });
    
            return () => {
                gameRef.off('value', listener);
            };
        }
    }, [gameId, currentUser, isSinglePlayer, forceSubject, schoolIdentifier]);

    // Fetch question pool for multiplayer games
    useEffect(() => {
        if (!isSinglePlayer && gameState && schoolIdentifier) {
            if (!gameState.grade || !gameState.subject) {
                return;
            }
            const { grade, subject } = gameState;
            const normalizedGrade = normalizePathSegment(grade);
            const normalizedSubject = normalizePathSegment(subject);
            const questionsRef = db.ref(`active_xo_questions/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}`);
            questionsRef.get().then(activeQsSnap => {
                const activeIds = activeQsSnap.val();
                if (!activeIds) throw new Error("No active questions for this game.");
                db.ref(`xo_questions/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}`).get().then(qsSnap => {
                    const allQs: XOQuestion[] = Object.values(qsSnap.val() || {});
                    const activeQuestions = allQs.filter(q => activeIds[q.id]);
                    setQuestionPool(activeQuestions.sort(() => 0.5 - Math.random()));
                });
            }).catch(err => setError(err.message));
        }
    }, [isSinglePlayer, gameState, schoolIdentifier]);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeGameState?.chat]);
    
    // Effect to check for game winner based on score
    useEffect(() => {
        if (isSinglePlayer || !gameState || gameState.status === 'finished') {
            return;
        }

        const { scores, players } = gameState;
        const player1 = players[0];
        const player2 = players[1];

        if (!player1 || !player2) return;

        const score1 = scores[player1.symbol] || 0;
        const score2 = scores[player2.symbol] || 0;

        const WINNING_SCORE = 2;

        if (score1 >= WINNING_SCORE || score2 >= WINNING_SCORE) {
            const winner = score1 >= WINNING_SCORE ? player1 : player2;
            const loser = score1 >= WINNING_SCORE ? player2 : player1;
            
            db.ref(`xo_games/${gameId}`).update({ status: 'finished' })
                .then(() => {
                    recordGameResult(winner, loser);
                });
        }
    }, [gameState, isSinglePlayer, gameId, recordGameResult]);

    const handleSquareClick = async (i: number) => {
        if (!activeGameState || activeGameState.winner || activeGameState.board[i] || activeGameState.currentQuestion) return;
        if (!isSinglePlayer && !activeGameState.players[1]) return;
        const amIPlayer1 = activeGameState.players[0]?.id === currentUser.id;
        const myTurn = amIPlayer1 ? activeGameState.xIsNext : !activeGameState.xIsNext;
        if (!myTurn && !isSinglePlayer) return;

        let pool = [...questionPool];
        if (pool.length === 0) pool = [...(questionPool.sort(() => 0.5 - Math.random()))];
        const nextQuestion = pool.pop();
        setQuestionPool(pool);
        if (!nextQuestion) { setError('انتهت الأسئلة!'); return; }
        
        const updates = { currentQuestion: nextQuestion, questionForSquare: i, questionTimerStart: Date.now() };
        if (isSinglePlayer) setLocalGameState(p => p ? { ...p, ...updates } : null);
        else await db.ref(`xo_games/${gameId}`).update(updates);
    };

    const handleAnswerSubmit = async () => {
        if (!activeGameState || selectedAnswer === null || activeGameState.questionForSquare === null) return;
        
        const amIPlayer1 = activeGameState.players[0]?.id === currentUser.id;
        const myTurn = amIPlayer1 ? activeGameState.xIsNext : !activeGameState.xIsNext;
        if (!myTurn && !isSinglePlayer) return;
        if (!isSinglePlayer && !activeGameState.players[1]) return;
    
        const isCorrect = selectedAnswer === activeGameState.currentQuestion?.correctOptionIndex;
        let newBoard = [...activeGameState.board];
    
        if (isCorrect) {
            const playerIndex = activeGameState.xIsNext ? 0 : 1;
            const currentSymbol = activeGameState.players[playerIndex]!.symbol;
            newBoard[activeGameState.questionForSquare] = currentSymbol;
        }
    
        const winnerFromBoard = calculateWinner(newBoard);
        const isBoardFull = !newBoard.includes(null);

        let newWinnerState: PlayerSymbol | 'draw' | null = null;
        if (winnerFromBoard) newWinnerState = winnerFromBoard;
        else if (isBoardFull) newWinnerState = 'draw';

        const newScores = { ...activeGameState.scores };
        if (winnerFromBoard) newScores[winnerFromBoard] = (newScores[winnerFromBoard] || 0) + 1;
    
        const updates = {
            board: newBoard, xIsNext: !activeGameState.xIsNext, winner: newWinnerState,
            currentQuestion: null, questionForSquare: null, questionTimerStart: null,
            updatedAt: Date.now(), scores: newScores,
        };
    
        setSelectedAnswer(null);
    
        if (isSinglePlayer) setLocalGameState(p => (p ? { ...p, ...updates } : null));
        else await db.ref(`xo_games/${gameId}`).update(updates);
    };

    const handleSelectSymbol = async (symbol: PlayerSymbol) => {
        if (isSinglePlayer || !gameState) return;
        const amIPlayer1 = gameState.players[0]?.id === currentUser.id;
        const playerIndex = amIPlayer1 ? 0 : 1;
        await db.ref(`xo_games/${gameId}/players/${playerIndex}/symbol`).set(symbol);
        setShowSymbolPicker(false);
    };

    const handleSendChat = async () => {
        if (!chatMessage.trim() || !gameState || isSinglePlayer) return;
        const newMessage: ChatMessage = { id: uuidv4(), senderId: currentUser.id, senderName: currentUser.name, text: chatMessage.trim(), timestamp: Date.now() };
        const newChat = [...(gameState.chat || []), newMessage];
        await db.ref(`xo_games/${gameId}/chat`).set(newChat);
        setChatMessage("");
    };

    const resetGame = async () => {
        const updates = {
            board: Array(9).fill(null), xIsNext: true, winner: null,
            currentQuestion: null, questionForSquare: null, questionTimerStart: null,
            updatedAt: Date.now(),
        };
        if (isSinglePlayer) setLocalGameState(p => p ? { ...p, ...updates } : null);
        else await db.ref(`xo_games/${gameId}`).update(updates);
    };
    
    const handleExitGame = async () => {
        if (isSinglePlayer) {
            onExit();
            return;
        }
        
        try {
            const gameRef = db.ref(`xo_games/${gameId}`);
            const snapshot = await gameRef.get();
            if (!snapshot.exists()) {
                onExit();
                return;
            }
    
            const gameData: XOGameState = snapshot.val();
    
            if (gameData.status === 'finished' || !gameData.players.some(p => p?.id === currentUser.id)) {
                onExit();
                return;
            }
    
            if (gameData.status === 'waiting_for_players' && gameData.players[0]?.id === currentUser.id) {
                await db.ref(`xo_matchmaking_queue/${normalizePathSegment(gameData.grade)}/${normalizePathSegment(gameData.subject)}/${gameId}`).remove();
                await gameRef.remove();
            } else if (gameData.players[0] && gameData.players[1]) {
                const winner = gameData.players.find(p => p?.id !== currentUser.id)!;
                const loser = gameData.players.find(p => p?.id === currentUser.id)!;
                
                await gameRef.update({ status: 'finished', winner: winner?.symbol || null });
                await recordGameResult(winner, loser);
            }
        } catch (err) {
            console.error("Error during game exit:", err);
        } finally {
            onExit();
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-12 w-12"/></div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}<button onClick={onExit} className="block mx-auto mt-4 px-4 py-2 bg-cyan-600 rounded">العودة</button></div>;
    if (!isSinglePlayer && !gameState) return <div className="p-8 text-center text-yellow-400"><AlertTriangle className="mx-auto h-12 w-12 mb-4" /><p className="text-xl font-bold">لم يتم العثور على اللعبة.</p><p className="text-gray-300">قد تكون اللعبة قد انتهت أو انضم إليها لاعب آخر.</p><button onClick={onExit} className="block mx-auto mt-4 px-4 py-2 bg-cyan-600 rounded">العودة</button></div>;
    if (!activeGameState) return <div className="p-8 text-center text-yellow-400"><AlertTriangle className="mx-auto h-12 w-12 mb-4" /><p className="text-xl font-bold">بيانات اللعبة غير مكتملة.</p><Loader2 className="animate-spin h-8 w-8 mx-auto my-4 text-yellow-400" /><button onClick={onExit} className="block mx-auto mt-4 px-4 py-2 bg-cyan-600 rounded">العودة</button></div>;
    
    const { players, board, xIsNext, winner, scores } = activeGameState;
    const player1 = players[0];
    const player2 = players[1];
    const isDraw = winner === 'draw' || (!winner && board.every(b => b !== null));
    const amIPlayer1 = player1?.id === currentUser.id;
    const myTurn = isSinglePlayer ? xIsNext : (player2 ? (amIPlayer1 ? xIsNext : !xIsNext) : false);
    
    let status;
    if (winner && winner !== 'draw') {
        const winnerPlayer = players.find(p => p?.symbol === winner);
        status = `اللاعب ${winnerPlayer?.name || '...'} فاز!`;
    } else if (isDraw) {
        status = 'تعادل!';
    } else if (!player2) {
        status = 'في انتظار انضمام اللاعب الثاني...';
    } else {
        status = `دور: ${xIsNext ? player1.name : player2.name}`;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-gray-900 text-white p-4 rounded-xl shadow-2xl">
            <div className="lg:col-span-2 flex flex-col items-center">
                 <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400">لعبة X-O المعرفية</h1>
                <p className="text-gray-400 mb-4">{activeGameState.subject} - {activeGameState.grade}</p>
                <div className="flex justify-around w-full max-w-md mb-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-center"><p className="text-2xl font-bold">{player1?.name}</p><p className="text-4xl font-bold">{scores[player1!.symbol] || 0}</p></div>
                    <div className="text-center"><p className="text-2xl font-bold">{player2?.name || 'انتظار لاعب...'}</p><p className="text-4xl font-bold">{player2 ? (scores[player2.symbol] || 0) : 0}</p></div>
                </div>
                <p className="text-2xl font-semibold mb-4">{status}</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
                    {board.map((square, i) => (<Square key={i} value={square} onClick={() => handleSquareClick(i)} index={i} winner={winner} isDraw={isDraw} />))}
                </div>
                {(winner || isDraw) && activeGameState.status !== 'finished' && <button onClick={resetGame} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-700"><RefreshCw/>لعبة جديدة</button>}
                <button onClick={handleExitGame} className="mt-4 text-sm text-gray-400 hover:underline">الخروج من اللعبة</button>
            </div>
            
            {!isSinglePlayer && (
                 <div className="lg:col-span-1 bg-gray-800 rounded-lg p-3 flex flex-col h-[70vh]">
                     <h3 className="text-lg font-bold mb-2 text-center">الدردشة</h3>
                     <div className="flex-1 bg-gray-900/50 rounded p-2 overflow-y-auto space-y-2">
                         {(activeGameState.chat || []).map(msg => (<div key={msg.id} className={`${msg.senderId === currentUser.id ? 'text-right' : 'text-left'}`}><span className="text-xs text-gray-400">{msg.senderName}</span><p className={`inline-block p-2 rounded-lg text-sm ${msg.senderId === currentUser.id ? 'bg-cyan-600' : 'bg-gray-600'}`}>{msg.text}</p></div>))}
                         <div ref={chatEndRef} />
                     </div>
                     <div className="mt-2 flex gap-2">
                        <input value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} placeholder="رسالة..." className="flex-1 bg-gray-700 border border-gray-600 p-2 rounded-md focus:outline-none"/>
                        <button onClick={handleSendChat} className="p-2 bg-cyan-600 rounded-md"><Send/></button>
                     </div>
                 </div>
            )}

            {activeGameState.currentQuestion && (
                <div className="fixed inset-0 bg-black/80 flex justify-center items-start overflow-y-auto z-50 p-4 pt-10 pb-10">
                    <div className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-2xl text-right">
                        <div className="mb-4"><p className="text-sm text-gray-400">الوقت المتبقي: {timeLeft} ثانية</p><div className="w-full bg-gray-600 h-2.5 mt-1 rounded-full"><div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${(timeLeft / (gameSettings?.questionTimeLimit || 60)) * 100}%`, transition: 'width 1s linear' }}></div></div></div>
                        <h3 className="text-2xl font-bold mb-6">{activeGameState.currentQuestion.questionText}</h3>
                        <div className="space-y-3">
                            {activeGameState.currentQuestion.options.map((option, i) => <button key={i} onClick={() => setSelectedAnswer(i)} disabled={!myTurn} className={`w-full p-4 text-right rounded-lg transition-colors text-lg ${selectedAnswer === i ? 'bg-cyan-500 ring-2 ring-cyan-300' : 'bg-gray-700 hover:bg-gray-600'} disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}>{option}</button>)}
                        </div>
                        <button onClick={handleAnswerSubmit} disabled={selectedAnswer === null || !myTurn} className="w-full mt-6 py-3 bg-green-600 font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-500">إرسال الإجابة</button>
                        {!myTurn && !isSinglePlayer && (<p className="text-center text-yellow-400 mt-4">بانتظار إجابة المنافس...</p>)}
                    </div>
                </div>
            )}
             {showSymbolPicker && (
                <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl p-6 text-center">
                        <h3 className="text-2xl font-bold mb-4">اختر رمزك</h3>
                        <div className="flex flex-wrap gap-4 justify-center">
                            {PLAYER_SYMBOLS.map(s => <button key={s} onClick={() => handleSelectSymbol(s)} className="w-20 h-20 text-5xl rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center">{s}</button>)}
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
}