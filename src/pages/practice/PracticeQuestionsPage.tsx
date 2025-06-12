import React, { useState, useEffect, useMemo } from 'react';
import { PracticeQuestion, CompanyData } from '../../types';
import { 
  getAllCompanyData, 
  getAllQuestions, 
  getQuestionStats, 
  getAllTopics, 
  getAllCompanies 
} from '../../utils/csvParser';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination"
import { Checkbox } from '../../components/ui/checkbox';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { Search, ExternalLink, Lock } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const PracticeQuestionsPage: React.FC = () => {
  const [companyData, setCompanyData] = useState<CompanyData[]>([]);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadData = () => {
      setLoading(true);
      try {
        const data = getAllCompanyData();
        setCompanyData(data);
        setQuestions(getAllQuestions(data));
      } catch (error) {
        console.error('Failed to load practice questions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = useMemo(() => getQuestionStats(questions), [questions]);
  const allTopics = useMemo(() => getAllTopics(questions), [questions]);
  const allCompanies = useMemo(() => getAllCompanies(companyData), [companyData]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(question => {
      const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           question.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           question.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCompany = selectedCompany === 'all' || question.company === selectedCompany;
      const matchesDifficulty = selectedDifficulty === 'all' || question.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
      const matchesTopics = selectedTopics.length === 0 || 
                           selectedTopics.some(topic => question.topics.includes(topic));

      return matchesSearch && matchesCompany && matchesDifficulty && matchesTopics;
    });
  }, [questions, searchTerm, selectedCompany, selectedDifficulty, selectedTopics]);

  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuestions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredQuestions, currentPage]);
  
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-600 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-900/50 dark:border-green-700';
      case 'Medium':
        return 'text-orange-600 bg-orange-100 border-orange-200 dark:text-orange-400 dark:bg-orange-900/50 dark:border-orange-700';
      case 'Hard':
        return 'text-red-600 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-900/50 dark:border-red-700';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-900/50 dark:border-gray-700';
    }
  };
  
  const getFrequencyWidth = (frequency: string) => {
    const value = parseFloat(frequency.replace('%', '')) || 0;
    return Math.min(value, 100);
  };
  
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Practice Questions</h1>
        <p className="text-muted-foreground">
          Browse through {stats.total.toLocaleString()} LeetCode questions asked in technical interviews
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Solved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 / {stats.total}</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Easy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">0 / {stats.easy}</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">0 / {stats.medium}</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">0 / {stats.hard}</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>

            <Select value={selectedDifficulty} onValueChange={(value) => { setSelectedDifficulty(value); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCompany} onValueChange={(value) => { setSelectedCompany(value); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All Companies</SelectItem>
                {allCompanies.map(company => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTopics.length > 0 ? selectedTopics[0] : 'all'} onValueChange={(value) => {
              setSelectedTopics(value === 'all' ? [] : [value]);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All Topics</SelectItem>
                {allTopics.map(topic => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Topics</TableHead>
                  <TableHead className="text-right">Acceptance</TableHead>
                  <TableHead className="text-right">Frequency</TableHead>
                  <TableHead className="text-center">Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedQuestions.map((question) => (
                  <TableRow key={`${question.company}-${question.id}`}>
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell className="font-medium">
                      <a
                        href={`https://leetcode.com${question.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-brand-blue transition-colors flex items-center gap-2"
                      >
                        {question.title}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {question.company}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${getDifficultyColor(question.difficulty)} font-medium`}>
                        {question.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {question.topics.slice(0, 3).map(topic => (
                          <Badge 
                            key={topic} 
                            variant="secondary"
                          >
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {question.acceptance}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-muted-foreground text-sm">{question.frequency}</span>
                        <div className="w-12 bg-secondary rounded-full h-1.5">
                          <div 
                            className="bg-brand-blue h-1.5 rounded-full" 
                            style={{ width: `${getFrequencyWidth(question.frequency)}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {question.isPremium && <Lock className="h-4 w-4 text-brand-orange mx-auto" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredQuestions.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">No questions found</p>
              <p className="text-sm">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              {/* Simplified pagination links */}
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  {currentPage}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default PracticeQuestionsPage; 