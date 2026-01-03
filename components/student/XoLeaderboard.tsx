import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { User, XOOverallLeaderboardEntry, ClassData, XOGameSettings, XOChallenge, Student, XOGameState, PlayerSymbol } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Loader2, Crown, Trophy, Gamepad2, Shield, Users, User as UserIcon, RefreshCw, AlertTriangle, Info, X, PlayCircle } from 'lucide-react';
import XoGame from './XoGame.tsx';
import XoChallenges from './XoChallenges.tsx';
import { v4 as uuidv4 } from 'uuid';
import { normalizePathSegment } from '../../lib/utils.ts';

interface XoLeaderboardProps {
    currentUser: User;
    gameToJoin?: { gameId: string, grade: string, subject: string } | null;
    onGameJoined?: () => void;
}

interface OpenChallenge {
    id: string;
    name: string;
    class: string;
    classId: string;
    section: string;
}

const getGameStatus = (settings?: XOGameSettings | null): { status: 'open' | 'closed' | 'upcoming'; message: string } => {
    if (!settings || !settings.startTime || !settings.endTime) {
        return { status: 'open', message: 'فترة اللعب مفتوحة' };
    }
    const now = new Date();
    const start = new Date(settings.startTime);
    const end = new Date(settings.endTime);

    if (now < start) {
        return { status: 'upcoming', message: `اللعب يبدأ في: ${start.toLocaleString('ar-EG')}` };
    }
    if (now > end) {
        return { status: 'closed', message: 'فترة اللعب قد انتهت' };
    }
    return { status: 'open', message: 'فترة اللعب مفتوحة حالياً' };
};

export default function XoLeaderboard({ currentUser, gameToJoin, onGameJoined }: XoLeaderboardProps) {
    const [leaderboard, setLeaderboard] = useState<XOOverallLeaderboardEntry[]>([]);
    const [availableSubjects, setAvailableSubjects] = useState<Array<{ grade: string, subject: string }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [gameId, setGameId] = useState<string | null>(null);
    const [mode, setMode] = useState<'lobby' | 'game' | 'waiting'>('lobby');
    const [lobbySubject, setLobbySubject] = useState<{ grade: string, subject: string } | null>(null);
    const [classmates, setClassmates] = useState<User[]>([]);
    const [gameSettings, setGameSettings] = useState<XOGameSettings | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRandomDisabledModalOpen, setIsRandomDisabledModalOpen] = useState(false);
    
    const [openChallenges, setOpenChallenges] = useState<OpenChallenge[]>([]);
    const [isChallengingAll, setIsChallengingAll] = useState(false);
    
    const openChallengeRef = useRef<any>(null);
    const [isTutorialVisible, setIsTutorialVisible] = useState(false);
    const [schoolIdentifier, setSchoolIdentifier] = useState<string | null>(null);

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

    useEffect(() => {
        if (gameToJoin) {
            setGameId(gameToJoin.gameId);
            setLobbySubject({ grade: gameToJoin.grade, subject: gameToJoin.subject });
            setMode('game');
            if (onGameJoined) {
                onGameJoined();
            }
        }
    }, [gameToJoin, onGameJoined]);

    useEffect(() => {
        if (!currentUser.principalId || !schoolIdentifier) {
            setIsLoading(false);
            return;
        }
        const leaderboardRef = db.ref(`xo_leaderboards/${schoolIdentifier}/overall`);
        const normalizedStage = normalizePathSegment(currentUser.stage || '');
        const questionsRef = db.ref(`active_xo_questions/${schoolIdentifier}/${normalizedStage}`);

        const leaderboardCallback = (snapshot: any) => {
            const data = snapshot.val() || {};
            const board: XOOverallLeaderboardEntry[] = Object.values(data);
            board.sort((a, b) => b.totalPoints - a.totalPoints);
            setLeaderboard(board.slice(0, 10));
        };

        const subjectsPromise = questionsRef.get().then(snapshot => {
            const data = snapshot.val();
            const subjects = data ? Object.keys(data).map(subject => ({ grade: currentUser.stage!, subject })) : [];
            setAvailableSubjects(subjects);
        });

        leaderboardRef.on('value', leaderboardCallback);
        Promise.all([subjectsPromise]).finally(() => setIsLoading(false));

        return () => leaderboardRef.off('value', leaderboardCallback);
    }, [currentUser.principalId, currentUser.stage, schoolIdentifier]);

     useEffect(() => {
        if (lobbySubject && schoolIdentifier) {
            const { grade, subject } = lobbySubject;
            const normalizedGrade = normalizePathSegment(grade);
            const normalizedSubject = normalizePathSegment(subject);

            const myOpenChallengeRef = db.ref(`xo_open_challenges/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}/${currentUser.id}`);
            openChallengeRef.current = myOpenChallengeRef;

            myOpenChallengeRef.get().then(snap => {
                setIsChallengingAll(snap.exists());
            });

            const allOpenChallengesRef = db.ref(`xo_open_challenges/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}`);
            const listener = allOpenChallengesRef.on('value', snapshot => {
                const data = snapshot.val() || {};
                const challengers = Object.values(data).filter((c: any) => c.id !== currentUser.id) as OpenChallenge[];
                setOpenChallenges(challengers);
            });
            
            return () => allOpenChallengesRef.off('value', listener);
        } else {
            if (openChallengeRef.current && isChallengingAll) {
                openChallengeRef.current.remove();
                setIsChallengingAll(false);
            }
        }
    }, [lobbySubject, currentUser, isChallengingAll, schoolIdentifier]);

    useEffect(() => {
        if (lobbySubject && schoolIdentifier) {
            setIsLoadingSettings(true);
            const { grade, subject } = lobbySubject;
            const normalizedGrade = normalizePathSegment(grade);
            const normalizedSubject = normalizePathSegment(subject);

            db.ref(`xo_game_settings/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}`).get().then(snapshot => {
                setGameSettings(snapshot.val());
            }).finally(() => setIsLoadingSettings(false));

            db.ref('classes').once('value', snapshot => {
                const allClasses: Record<string, ClassData> = snapshot.val() || {};
                const studentClass = Object.values(allClasses).find(c => c.id === currentUser.classId);
                const fellowStudents = (studentClass?.students || [])
                    .filter(s => s.id !== currentUser.id && s.studentAccessCode)
                    .map((s): User => ({
                        id: s.id, role: 'student', name: s.name, code: s.studentAccessCode || '',
                        principalId: currentUser.principalId, stage: currentUser.stage,
                        classId: currentUser.classId, section: currentUser.section,
                    }));
                setClassmates(fellowStudents);
            });
        }
    }, [lobbySubject, currentUser, schoolIdentifier]);
    
    useEffect(() => {
        const challengesRef = db.ref(`xo_challenges/${currentUser.id}`);
        const listener = challengesRef.on('child_added', (snapshot) => {
            const challenge: XOChallenge = snapshot.val();
            if (challenge && challenge.status === 'accepted' && challenge.gameId) {
                setGameId(challenge.gameId);
                setLobbySubject({ grade: challenge.grade, subject: challenge.subject });
                setMode('game');
                snapshot.ref.remove();
            }
        });
        return () => challengesRef.off('child_added', listener);
    }, [currentUser.id]);
    
    const handleRandomMatch = async () => {
        setIsRandomDisabledModalOpen(true);
    };
    
    const handleChallenge = (targetUser: User) => {
        if (!lobbySubject) return;
        const newChallenge: Omit<XOChallenge, 'id'> = {
            challengerId: currentUser.id, challengerName: currentUser.name, challengerClass: `${currentUser.stage} / ${currentUser.section}`,
            challengerClassId: currentUser.classId, challengerSection: currentUser.section,
            targetId: targetUser.id, grade: lobbySubject.grade, subject: lobbySubject.subject,
            status: 'pending', createdAt: Date.now()
        };
        const challengeId = uuidv4();
        db.ref(`xo_challenges/${targetUser.id}/${challengeId}`).set({ ...newChallenge, id: challengeId });
        alert(`تم إرسال تحدي إلى ${targetUser.name}!`);
    };
    
    const handleStartSinglePlayer = () => {
        if (!lobbySubject) return;
        setGameId(null);
        setMode('game');
    };
    
    const handleGameStartFromChallenge = (gameId: string, grade: string, subject: string) => {
        setGameId(gameId);
        setLobbySubject({ grade, subject });
        setMode('game');
    };
    
    const handleChallengeAllToggle = () => {
        if (!lobbySubject || !openChallengeRef.current) return;
        if (isChallengingAll) {
            openChallengeRef.current.remove();
            setIsChallengingAll(false);
        } else {
            openChallengeRef.current.set({
                id: currentUser.id,
                name: currentUser.name,
                class: `${currentUser.stage} / ${currentUser.section}`,
                classId: currentUser.classId,
                section: currentUser.section,
            });
            setIsChallengingAll(true);
        }
    };

    const handleAcceptOpenChallenge = async (challenger: OpenChallenge) => {
        if (!lobbySubject || !schoolIdentifier) return;
        const { grade, subject } = lobbySubject;
        const normalizedGrade = normalizePathSegment(grade);
        const normalizedSubject = normalizePathSegment(subject);

        const challengerRef = db.ref(`xo_open_challenges/${schoolIdentifier}/${normalizedGrade}/${normalizedSubject}/${challenger.id}`);
        const { committed } = await challengerRef.transaction(currentData => {
            return currentData === null ? undefined : null;
        });

        if (!committed) {
            alert("للأسف، لقد قبل لاعب آخر التحدي قبلك!");
            return;
        }

        const newGameId = uuidv4();
        const newGame: XOGameState = {
            id: newGameId, principalId: schoolIdentifier, grade, subject,
            status: 'in_progress',
            players: [
                { id: challenger.id, name: challenger.name, symbol: 'X', classId: challenger.classId, section: challenger.section },
                { id: currentUser.id, name: currentUser.name, symbol: 'O', classId: currentUser.classId, section: currentUser.section }
            ],
            board: Array(9).fill(null), xIsNext: true, winner: null,
            // FIX: Initialize XOGameState.scores with all possible PlayerSymbol keys to satisfy the Record<PlayerSymbol, number> type.
            scores: { 'X': 0, 'O': 0, '⭐': 0, '🌙': 0, '❤️': 0, '🔷': 0 },
            currentQuestion: null, questionForSquare: null, questionTimerStart: null,
            chat: [], createdAt: Date.now(), updatedAt: Date.now()
        };
        
        await db.ref(`xo_games/${newGameId}`).set(newGame);

        const notificationChallenge: XOChallenge = {
            id: newGameId,
            challengerId: currentUser.id,
            challengerName: currentUser.name,
            challengerClass: `${currentUser.stage} / ${currentUser.section}`,
            targetId: challenger.id,
            grade, subject, status: 'accepted',
            createdAt: Date.now(), gameId: newGameId,
        };
        await db.ref(`xo_challenges/${challenger.id}/${newGameId}`).set(notificationChallenge);

        handleGameStartFromChallenge(newGameId, grade, subject);
        setIsChallengeModalOpen(false);
    };

    const getRankIcon = (rank: number) => {
        if (rank === 0) return <Crown className="text-yellow-400" />;
        if (rank === 1) return <Trophy className="text-gray-400" />;
        if (rank === 2) return <Shield className="text-yellow-600" />;
        return <span className="font-mono">{rank + 1}</span>;
    };
    
    const handleExitGame = () => {
        db.ref(`xo_games/${gameId}`).get().then(snapshot => {
            if (snapshot.exists()) {
                const gameData = snapshot.val();
                if (gameData.status === 'waiting_for_players' && gameData.players[0].id === currentUser.id) {
                    const normalizedGrade = normalizePathSegment(gameData.grade);
                    const normalizedSubject = normalizePathSegment(gameData.subject);
                    db.ref(`xo_matchmaking_queue/${normalizedGrade}/${normalizedSubject}/${gameId}`).remove();
                    db.ref(`xo_games/${gameId}`).remove();
                }
            }
        });
        setGameId(null);
        setMode('lobby');
    };
    
    if (mode === 'game') {
        return <XoGame currentUser={currentUser} gameId={gameId} forceSubject={lobbySubject} onExit={handleExitGame} />;
    }

    if (mode === 'waiting') {
        return (
            <div className="text-center p-8 bg-gray-900 rounded-xl text-white">
                <Loader2 className="animate-spin h-16 w-16 mx-auto mb-4"/>
                <h2 className="text-2xl font-bold">جاري البحث عن لعبة...</h2>
                {error && <p className="text-red-400 mt-2">{error}</p>}
                <button onClick={() => setMode('lobby')} className="mt-6 px-4 py-2 bg-red-600 rounded-lg">إلغاء</button>
            </div>
        )
    }

    const renderLobby = () => {
        if (!lobbySubject) return null;
        if (isLoadingSettings) return <div className="p-8 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto"/></div>
        
        const gameStatus = getGameStatus(gameSettings);

        return (
            <div className="bg-white p-6 rounded-xl shadow-lg">
                 {isChallengeModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4">تحدي صديق</h3>
                            <div className="max-h-80 overflow-y-auto space-y-2">
                                {openChallenges.length > 0 && <h4 className="font-bold text-cyan-700">لاعبون يتحدون الجميع</h4>}
                                {openChallenges.map(c => (
                                     <div key={c.id} className="flex justify-between items-center p-2 bg-cyan-50 rounded-md">
                                        <div>
                                            <span className="font-semibold">{c.name}</span>
                                            <span className="text-xs text-gray-500 block">{c.class}</span>
                                        </div>
                                        <button onClick={() => handleAcceptOpenChallenge(c)} className="px-3 py-1 bg-cyan-500 text-white text-sm rounded-md font-bold">يتحداك</button>
                                    </div>
                                ))}
                                {classmates.length > 0 && <h4 className="font-bold text-purple-700 mt-4">زملاء الصف</h4>}
                                {classmates.map(c => (
                                    <div key={c.id} className="flex justify-between items-center p-2 bg-gray-100 rounded-md">
                                        <span className="font-semibold">{c.name}</span>
                                        <button onClick={() => { handleChallenge(c); }} className="px-3 py-1 bg-purple-500 text-white text-sm rounded-md">تحدي</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setIsChallengeModalOpen(false)} className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg">إغلاق</button>
                        </div>
                    </div>
                )}
                <button onClick={() => setLobbySubject(null)} className="mb-4 text-sm font-semibold text-cyan-600">&larr; العودة لاختيار مادة</button>
                <h2 className="text-2xl font-bold text-center">{lobbySubject.subject}</h2>
                <div className={`text-center p-2 rounded-md my-4 font-semibold ${gameStatus.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {gameStatus.message}
                </div>

                <div className="p-4 border-2 border-dashed border-cyan-500 rounded-lg mb-4 bg-cyan-50">
                    <h3 className="font-bold text-lg text-cyan-800 mb-2 flex items-center gap-2"><Info/>قواعد المسابقة</h3>
                    <ul className="list-disc pr-5 space-y-1 text-cyan-900">
                        <li><b>سياسة النقاط:</b> {gameSettings?.pointsPolicy === 'winner_takes_all' ? 'الفائز يحصل على كل النقاط' : 'منح النقاط للجميع'}</li>
                        <li><b>زمن الإجابة:</b> {gameSettings?.questionTimeLimit || 60} ثانية لكل سؤال</li>
                    </ul>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={handleRandomMatch} disabled={gameStatus.status !== 'open'} className="flex flex-col items-center justify-center p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                        <RefreshCw size={32}/>
                        <span className="text-xl font-bold mt-2">تحدي عشوائي</span>
                    </button>
                     <button onClick={() => setIsChallengeModalOpen(true)} disabled={gameStatus.status !== 'open'} className="flex flex-col items-center justify-center p-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400">
                        <Users size={32}/>
                        <span className="text-xl font-bold mt-2">تحدي صديق</span>
                    </button>
                    <button onClick={handleChallengeAllToggle} disabled={gameStatus.status !== 'open'} className={`flex flex-col items-center justify-center p-4 text-white rounded-lg transition-colors disabled:bg-gray-400 ${isChallengingAll ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                        <Shield size={24}/>
                        <span className="font-bold mt-2">{isChallengingAll ? 'إلغاء تحدي الجميع' : 'تحدي الجميع'}</span>
                    </button>
                     {gameSettings?.allowSinglePlayer && (
                        <button onClick={handleStartSinglePlayer} className="w-full flex flex-col items-center justify-center p-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors">
                            <UserIcon size={24}/>
                            <span className="font-bold mt-2">لعب فردي (للتدريب)</span>
                        </button>
                     )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {isRandomDisabledModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={() => setIsRandomDisabledModalOpen(false)}>
                    <div className="bg-white p-8 rounded-xl shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">نعتذر</h3>
                        <p className="text-lg text-gray-700">التحدي العشوائي متوقف مؤقتا حتى بلوغ عدد المشتركين للمرحلة الدراسية في هذه المدرسة 50 طالب</p>
                        <button onClick={() => setIsRandomDisabledModalOpen(false)} className="mt-6 px-6 py-2 bg-cyan-600 text-white font-semibold rounded-lg">
                            حسناً
                        </button>
                    </div>
                </div>
            )}
            {isTutorialVisible && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4"
                    onClick={() => setIsTutorialVisible(false)}
                >
                    <div 
                        className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsTutorialVisible(false)}
                            className="absolute -top-3 -right-3 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"
                            aria-label="Close video"
                        >
                            <X size={24} />
                        </button>
                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                            <iframe
                                src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F61578356680977%2Fvideos%2F1274244861093263%2F&show_text=false&autoplay=1&mute=0"
                                className="absolute top-0 left-0 w-full h-full"
                                style={{ border: 'none', overflow: 'hidden' }}
                                title="Facebook video player"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                allowFullScreen={true}>
                            </iframe>
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">🏆 قاعة الشرف - أفضل 10 لاعبين 🏆</h2>
                 <button
                    onClick={() => setIsTutorialVisible(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition shadow mb-6"
                >
                    <PlayCircle />
                    شاهد طريقة لعب xo التعليمية
                </button>
                {isLoading ? <Loader2 className="animate-spin mx-auto"/> : (
                    <div className="space-y-2">
                        {leaderboard.map((player, index) => (
                            <div key={player.studentId} className={`flex items-center p-3 rounded-lg ${
                                index === 0 ? 'bg-yellow-100' : 
                                index === 1 ? 'bg-gray-200' : 
                                index === 2 ? 'bg-yellow-200' : 'bg-gray-50'
                            }`}>
                                <div className="w-10 text-center text-xl font-bold">{getRankIcon(index)}</div>
                                <div className="flex-grow font-semibold text-lg">{player.studentName}</div>
                                <div className="text-xl font-bold text-cyan-600">{player.totalPoints} نقطة</div>
                            </div>
                        ))}
                         {leaderboard.length === 0 && <p className="text-center text-gray-500 p-4">لا توجد بيانات في قاعة الشرف بعد. كن أول الأبطال!</p>}
                    </div>
                )}
            </div>
            
            {lobbySubject ? renderLobby() : (
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">🎮 اختر مسابقة لتبدأ اللعب 🎮</h2>
                    {isLoading ? <Loader2 className="animate-spin mx-auto"/> : (
                        availableSubjects.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {availableSubjects.map(({ grade, subject }) => (
                                    <button
                                        key={`${grade}-${subject}`}
                                        onClick={() => setLobbySubject({ grade, subject })}
                                        className="flex items-center justify-center gap-3 p-6 bg-cyan-600 text-white font-bold text-xl rounded-lg hover:bg-cyan-700 transition-transform transform hover:scale-105"
                                    >
                                        <Gamepad2 />
                                        <span>{subject}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-4">لا توجد مسابقات متاحة لمرحلتك الدراسية حالياً.</p>
                        )
                    )}
                </div>
            )}
        </div>
    );
}