import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { User } from '../../types';
import { Code, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface LeetCodeStatsProps {
  user: User;
  showDetails?: boolean;
  compact?: boolean;
}

const LeetCodeStats: React.FC<LeetCodeStatsProps> = ({ 
  user, 
  showDetails = true, 
  compact = false 
}) => {
  const isLinked = user.leetcodeCookieStatus === 'LINKED';
  const isExpired = user.leetcodeCookieStatus === 'EXPIRED';
  const hasStats = user.leetcodeTotalSolved !== null && user.leetcodeTotalSolved !== undefined;

  const getStatusBadge = () => {
    if (isLinked) {
      return <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Linked
      </Badge>;
    } else if (isExpired) {
      return <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        Expired
      </Badge>;
    } else {
      return <Badge variant="secondary">
        <Circle className="h-3 w-3 mr-1" />
        Not Linked
      </Badge>;
    }
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-red-600 bg-red-50';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Code className="h-4 w-4 text-orange-500" />
        {isLinked && hasStats ? (
          <span className="text-sm font-medium">{user.leetcodeTotalSolved} solved</span>
        ) : (
          <span className="text-sm text-muted-foreground">Not linked</span>
        )}
        {getStatusBadge()}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">LeetCode</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        {user.leetcodeUsername && (
          <CardDescription>@{user.leetcodeUsername}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isLinked && hasStats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {user.leetcodeTotalSolved}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-semibold px-2 py-1 rounded ${getDifficultyColor('easy')}`}>
                  {user.leetcodeEasySolved || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Easy</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-semibold px-2 py-1 rounded ${getDifficultyColor('medium')}`}>
                  {user.leetcodeMediumSolved || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Medium</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-semibold px-2 py-1 rounded ${getDifficultyColor('hard')}`}>
                  {user.leetcodeHardSolved || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Hard</div>
              </div>
            </div>
            
            {showDetails && (
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Progress breakdown by difficulty level
                </div>
              </div>
            )}
          </div>
        ) : isExpired ? (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              LeetCode session expired. Please re-link your account.
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <Circle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Link your LeetCode account to see statistics
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeetCodeStats; 