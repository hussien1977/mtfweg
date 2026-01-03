import React from 'react';
import type { User, XOChallenge, XOGameState, PlayerSymbol } from '../../types.ts';
import { db } from '../../lib/firebase';
import { Swords, Check, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface XoChallengesProps {
    currentUser: User;
    challenges: XOChallenge[];
    onGameStart: (gameId: string, grade: string, subject: string) => void;
}

export default function XoChallenges({ currentUser, challenges, onGameStart }: XoChallengesProps) {
    
    const handleAccept = async (challenge: XOChallenge) => {
        if (!currentUser.principalId) return;

        // 1. Create a new game
        const newGameId = uuidv4();
        const newGame: XOGameState = {
            id: newGameId,
            principalId: currentUser.principalId,
            grade: challenge.grade,
            subject: challenge.subject,
            status: 'in_progress',
            players: [
                { id: challenge.challengerId, name: challenge.challengerName, symbol: 'X', classId: challenge.challengerClassId, section: challenge.challengerSection },
                { id: currentUser.id, name: currentUser.name, symbol: 'O', classId: currentUser.classId, section: currentUser.section }
            ],
            board: Array(9).fill(null),
            xIsNext: true,
            winner: null,
            scores: { 'X': 0, 'O': 0, '⭐': 0, '🌙': 0, '❤️': 0, '🔷': 0 },
            currentQuestion: null,
            questionForSquare: null,
            questionTimerStart: null,
            chat: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        await db.ref(`xo_games/${newGameId}`).set(newGame);

        // 2. Create a notification challenge for the challenger to join
        const notificationChallenge: XOChallenge = {
            ...challenge,
            id: newGameId, 
            status: 'accepted',
            gameId: newGameId,
        };
        await db.ref(`xo_challenges/${challenge.challengerId}/${newGameId}`).set(notificationChallenge);

        // 3. Remove this incoming challenge
        await db.ref(`xo_challenges/${currentUser.id}/${challenge.id}`).remove();

        // 4. Navigate this user to the game via callback
        onGameStart(newGameId, challenge.grade, challenge.subject);
    };

    const handleDecline = (challenge: XOChallenge) => {
        db.ref(`xo_challenges/${currentUser.id}/${challenge.id}`).remove();
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4 flex items-center gap-3">
                <Swords className="text-red-500" />
                التحديات الواردة
            </h2>

            {challenges.length > 0 ? (
                <div className="space-y-4">
                    {challenges.map(challenge => (
                        <div key={challenge.id} className="p-4 bg-gray-50 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div>
                                <p className="text-lg font-bold text-cyan-700">{challenge.challengerName}</p>
                                <p className="text-sm text-gray-600">
                                    يتحدّاك في مادة <span className="font-semibold">{challenge.subject}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">من شعبة: {challenge.challengerClass}</p>
                                <p className="italic text-purple-600 mt-2">"هل أنت مستعد للمنافسة؟ أظهر مهارتك!"</p>
                            </div>
                            <div className="flex gap-3 mt-3 sm:mt-0">
                                <button onClick={() => handleDecline(challenge)} className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-transform transform hover:scale-110">
                                    <X />
                                </button>
                                <button onClick={() => handleAccept(challenge)} className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-transform transform hover:scale-110">
                                    <Check />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 p-8">
                    <p className="text-xl">لا توجد تحديات جديدة في انتظارك.</p>
                    <p className="mt-2">اذهب إلى صفحة لعبة XO وأرسل تحديًا لزملائك!</p>
                </div>
            )}
        </div>
    );
}