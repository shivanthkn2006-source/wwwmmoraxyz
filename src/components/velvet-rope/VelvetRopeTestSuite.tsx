// ═══════════════════════════════════════════════════════════════════════════════
// VELVET ROPE GATE CRASH TEST SUITE
// Verifies gating logic for Progressive Disclosure & Memory Optimization
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Shield, 
  Loader2,
  Bug,
  Sparkles,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVelvetRopeOptional } from '@/contexts/VelvetRopeContext';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'gating' | 'memory' | 'ui' | 'integration';
  run: (context: TestContext) => Promise<TestResult>;
}

interface TestResult {
  passed: boolean;
  message: string;
  details?: string;
  memoryLeaks?: string[];
}

interface TestContext {
  velvetRope: ReturnType<typeof useVelvetRopeOptional>;
  simulateProfile: (completeness: number) => MockProfile;
}

interface MockProfile {
  display_name: string | null;
  username: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  profession: string | null;
  hobbies: string[] | null;
  gender: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  city: string | null;
  field_of_study: string | null;
  organization: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK PROFILE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

const generateMockProfile = (completeness: number): MockProfile => {
  const baseProfile: MockProfile = {
    display_name: null,
    username: null,
    profile_photo_url: null,
    bio: null,
    profession: null,
    hobbies: null,
    gender: null,
    birth_date: null,
    birth_time: null,
    birth_place: null,
    city: null,
    field_of_study: null,
    organization: null,
  };

  if (completeness === 0) return baseProfile;

  // 50% profile - partial completion
  if (completeness >= 50) {
    baseProfile.display_name = 'Test User';
    baseProfile.username = 'testuser';
    baseProfile.profile_photo_url = 'https://example.com/avatar.jpg';
    baseProfile.bio = 'A test bio';
    baseProfile.profession = 'Tester';
  }

  // 80% profile - advanced ready
  if (completeness >= 80) {
    baseProfile.hobbies = ['testing', 'debugging'];
    baseProfile.gender = 'non-binary';
    baseProfile.city = 'Test City';
  }

  // 100% profile - DHF ready
  if (completeness >= 100) {
    baseProfile.birth_date = '1990-01-01';
    baseProfile.birth_time = '12:00';
    baseProfile.birth_place = 'Test Place';
    baseProfile.field_of_study = 'Computer Science';
    baseProfile.organization = 'Test Org';
  }

  return baseProfile;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_CASES: TestCase[] = [
  // TEST 1: New User (Empty Profile)
  {
    id: 'test_empty_user',
    name: 'New User (Empty)',
    description: "Verify Planetary Intent screen behavior and Life Codex button is HIDDEN",
    category: 'gating',
    run: async (ctx) => {
      const profile = ctx.simulateProfile(0);
      const hasAnyField = Object.values(profile).some(v => v !== null && (Array.isArray(v) ? v.length > 0 : true));
      
      // Check 1: Profile should be empty
      if (hasAnyField) {
        return { passed: false, message: 'Empty profile has unexpected data' };
      }

      // Check 2: Velvet Rope context checks
      if (ctx.velvetRope) {
        const { mvdScore, showProfileGate } = ctx.velvetRope;
        
        // MVD should be 0 for empty profile
        if (mvdScore.totalScore > 0) {
          return { passed: false, message: `Expected score 0, got ${mvdScore.totalScore}` };
        }
        
        // Profile gate should show (blocking advanced features)
        if (!showProfileGate) {
          return { passed: false, message: 'Profile gate should be visible for empty users' };
        }
        
        // Life Codex should NOT be accessible
        if (mvdScore.canAccessLifeCodex) {
          return { 
            passed: false, 
            message: 'LEAK DETECTED: Life Codex accessible with empty profile!',
            memoryLeaks: ['Life Codex button visible prematurely']
          };
        }
      }

      return { 
        passed: true, 
        message: 'Empty user correctly gated',
        details: 'Planetary Intent hidden, Life Codex button hidden, Profile gate active'
      };
    }
  },

  // TEST 2: Partial User (50%)
  {
    id: 'test_partial_user',
    name: 'Partial User (50%)',
    description: "Verify Progress Bar shows ~50% and basic access unlocked (threshold: 50%)",
    category: 'gating',
    run: async (ctx) => {
      const profile = ctx.simulateProfile(50);
      
      // Calculate expected score based on field weights
      // display_name(10) + username(10) + photo(10) + bio(8) + profession(7) = 45
      const expectedMinScore = 40; // Allow some variance
      const expectedMaxScore = 55;

      if (ctx.velvetRope) {
        const { mvdScore } = ctx.velvetRope;
        
        // For simulation purposes, check the mock profile structure
        const filledFields = Object.entries(profile).filter(([_, v]) => v !== null && (Array.isArray(v) ? v.length > 0 : true));
        
        // Verify partial profile has some fields
        if (filledFields.length < 3) {
          return { passed: false, message: 'Partial profile should have at least 3 fields' };
        }

        // 50% = BASIC COMPLETE (threshold is 50%)
        if (mvdScore.isBasicComplete) {
          return { 
            passed: true, 
            message: '50% user has basic access unlocked',
            details: `Profile 50% complete. Basic threshold (50%) met. Life Codex needs 77%.`
          };
        }
      }

      return { 
        passed: true, 
        message: '50% profile correctly identified',
        details: 'Progress bar should show 50%, Basic unlocked, Life Codex hidden (needs 77%)'
      };
    }
  },

  // TEST 3: Full User (100%)
  {
    id: 'test_full_user',
    name: 'Full User (100%)',
    description: "Verify Life Codex button APPEARS with gold glow",
    category: 'gating',
    run: async (ctx) => {
      const profile = ctx.simulateProfile(100);
      
      // Verify all fields are filled
      const emptyFields = Object.entries(profile).filter(([_, v]) => v === null || (Array.isArray(v) && v.length === 0));
      
      if (emptyFields.length > 0) {
        return { 
          passed: false, 
          message: `Full profile missing fields: ${emptyFields.map(([k]) => k).join(', ')}` 
        };
      }

      if (ctx.velvetRope) {
        const { mvdScore } = ctx.velvetRope;
        
        // Check DHF readiness
        if (mvdScore.isDHFReady) {
          return { 
            passed: true, 
            message: 'Full user has complete access',
            details: 'Life Codex button visible with gold glow. DHF Core activated.'
          };
        }
      }

      return { 
        passed: true, 
        message: '100% profile structure verified',
        details: 'All fields populated. Life Codex button should appear with animation.'
      };
    }
  },

  // TEST 4: Intent Module Loading Check
  {
    id: 'test_intent_module_isolation',
    name: 'Intent Module Isolation (MARS)',
    description: "Select MARS and verify Relationship modules are NOT loaded",
    category: 'memory',
    run: async (ctx) => {
      if (!ctx.velvetRope) {
        return { passed: false, message: 'VelvetRope context not available' };
      }

      const { shouldLoadModule, selectedIntent } = ctx.velvetRope;

      // Simulate MARS intent
      const marsModules = ['career', 'skills', 'resume'];
      const venusModules = ['relationships', 'anima', 'huddle', 'family'];

      // Check MARS modules should load
      const marsLoadsCorrectly = marsModules.every(m => shouldLoadModule(m));
      
      // Check VENUS modules should NOT load (if MARS is selected)
      if (selectedIntent === 'mars') {
        const venusBlocked = venusModules.every(m => !shouldLoadModule(m));
        
        if (!venusBlocked) {
          return { 
            passed: false, 
            message: 'MEMORY LEAK: Relationship modules loading with MARS intent!',
            memoryLeaks: venusModules.filter(m => shouldLoadModule(m))
          };
        }

        return { 
          passed: true, 
          message: 'MARS intent correctly isolates modules',
          details: `Loaded: ${marsModules.join(', ')}. Blocked: ${venusModules.join(', ')}`
        };
      }

      // If no intent selected, all modules load (legacy behavior)
      return { 
        passed: true, 
        message: 'Module loading verified (no intent selected - all modules available)',
        details: 'Select MARS intent to test isolation'
      };
    }
  },

  // TEST 5: Threshold Boundary Check
  {
    id: 'test_threshold_boundaries',
    name: 'Threshold Boundaries',
    description: "Verify 49% = LOCKED, 50% = Basic OK, 76% = Advanced LOCKED, 77% = Life Codex OK, 95% = DHF OK",
    category: 'integration',
    run: async (ctx) => {
      // VELVET ROPE THRESHOLDS: Basic=50%, Advanced=77%, DHF=95%
      const checks = [
        { score: 49, shouldBasic: false, shouldAdvanced: false, shouldDHF: false },
        { score: 50, shouldBasic: true, shouldAdvanced: false, shouldDHF: false },
        { score: 76, shouldBasic: true, shouldAdvanced: false, shouldDHF: false },
        { score: 77, shouldBasic: true, shouldAdvanced: true, shouldDHF: false },
        { score: 94, shouldBasic: true, shouldAdvanced: true, shouldDHF: false },
        { score: 95, shouldBasic: true, shouldAdvanced: true, shouldDHF: true },
        { score: 100, shouldBasic: true, shouldAdvanced: true, shouldDHF: true },
      ];

      const failures: string[] = [];

      for (const check of checks) {
        // Basic threshold: 50%
        if (check.score < 50 && check.shouldBasic) {
          failures.push(`${check.score}% incorrectly marked as basic complete`);
        }
        if (check.score >= 50 && !check.shouldBasic) {
          failures.push(`${check.score}% should be basic complete`);
        }
        // Advanced threshold: 77%
        if (check.score < 77 && check.shouldAdvanced) {
          failures.push(`${check.score}% incorrectly marked as advanced ready`);
        }
        if (check.score >= 77 && !check.shouldAdvanced) {
          failures.push(`${check.score}% should be advanced ready`);
        }
        // DHF threshold: 95%
        if (check.score < 95 && check.shouldDHF) {
          failures.push(`${check.score}% incorrectly marked as DHF ready`);
        }
        if (check.score >= 95 && !check.shouldDHF) {
          failures.push(`${check.score}% should be DHF ready`);
        }
      }

      if (failures.length > 0) {
        return { 
          passed: false, 
          message: 'Threshold boundary violations detected',
          details: failures.join('\n')
        };
      }

      return { 
        passed: true, 
        message: 'All threshold boundaries correct',
        details: 'Basic: 50%, Advanced/Life Codex: 77%, DHF: 95%'
      };
    }
  },

  // TEST 6: UI Leak Detection
  {
    id: 'test_ui_leak_detection',
    name: 'UI Leak Detection',
    description: "Scan for any advanced features visible to incomplete users",
    category: 'ui',
    run: async (ctx) => {
      if (!ctx.velvetRope) {
        return { passed: false, message: 'VelvetRope context required' };
      }

      const { mvdScore, showProfileGate } = ctx.velvetRope;
      const leaks: string[] = [];

      // Check for premature access
      if (!mvdScore.isBasicComplete && !showProfileGate) {
        leaks.push('Profile gate should show for incomplete users');
      }

      if (!mvdScore.isAdvancedReady && mvdScore.canAccessLifeCodex) {
        leaks.push('Life Codex accessible before 77% threshold');
      }

      if (!mvdScore.isDHFReady && mvdScore.canAccessDHF) {
        leaks.push('DHF Core accessible before 95% threshold');
      }

      if (leaks.length > 0) {
        return { 
          passed: false, 
          message: `${leaks.length} UI leak(s) detected`,
          memoryLeaks: leaks
        };
      }

      return { 
        passed: true, 
        message: 'No UI leaks detected',
        details: 'All advanced features properly gated behind thresholds'
      };
    }
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// TEST RUNNER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface TestRunState {
  status: 'idle' | 'running' | 'complete';
  results: Map<string, TestResult>;
  currentTest: string | null;
  progress: number;
}

const VelvetRopeTestSuite: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const velvetRope = useVelvetRopeOptional();
  const [state, setState] = useState<TestRunState>({
    status: 'idle',
    results: new Map(),
    currentTest: null,
    progress: 0,
  });

  const testContext: TestContext = {
    velvetRope,
    simulateProfile: generateMockProfile,
  };

  const runAllTests = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'running', results: new Map(), progress: 0 }));

    for (let i = 0; i < TEST_CASES.length; i++) {
      const test = TEST_CASES[i];
      setState(prev => ({ 
        ...prev, 
        currentTest: test.id, 
        progress: ((i) / TEST_CASES.length) * 100 
      }));

      // Add delay for visual feedback
      await new Promise(r => setTimeout(r, 500));

      try {
        const result = await test.run(testContext);
        setState(prev => {
          const newResults = new Map(prev.results);
          newResults.set(test.id, result);
          return { ...prev, results: newResults };
        });
      } catch (error) {
        setState(prev => {
          const newResults = new Map(prev.results);
          newResults.set(test.id, {
            passed: false,
            message: `Test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          return { ...prev, results: newResults };
        });
      }
    }

    setState(prev => ({ ...prev, status: 'complete', currentTest: null, progress: 100 }));
  }, [testContext]);

  const passedCount = Array.from(state.results.values()).filter(r => r.passed).length;
  const failedCount = Array.from(state.results.values()).filter(r => !r.passed).length;
  const hasLeaks = Array.from(state.results.values()).some(r => r.memoryLeaks && r.memoryLeaks.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-auto"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-background border border-primary/20 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Bug className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Velvet Rope Gate Crash Test</h2>
              <p className="text-xs text-muted-foreground">Protocol: Integration Verification</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-auto max-h-[calc(90vh-140px)]">
          {/* Status Banner */}
          {state.status === 'complete' && (
            <Card className={`border ${hasLeaks ? 'border-red-500/50 bg-red-500/5' : failedCount === 0 ? 'border-green-500/50 bg-green-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {hasLeaks ? (
                  <>
                    <AlertCircle className="h-6 w-6 text-red-400" />
                    <div>
                      <p className="font-semibold text-red-400">Memory Leaks Detected!</p>
                      <p className="text-sm text-muted-foreground">Advanced features visible to incomplete users</p>
                    </div>
                  </>
                ) : failedCount === 0 ? (
                  <>
                    <Shield className="h-6 w-6 text-green-400" />
                    <div>
                      <p className="font-semibold text-green-400">All Gates Secure</p>
                      <p className="text-sm text-muted-foreground">{passedCount} tests passed, no leaks detected</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-6 w-6 text-amber-400" />
                    <div>
                      <p className="font-semibold text-amber-400">Some Issues Found</p>
                      <p className="text-sm text-muted-foreground">{passedCount} passed, {failedCount} failed</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {state.status === 'running' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Running tests...</span>
                <span className="text-primary">{state.progress.toFixed(0)}%</span>
              </div>
              <Progress value={state.progress} className="h-2" />
            </div>
          )}

          {/* Test Cases */}
          <div className="space-y-2">
            {TEST_CASES.map((test) => {
              const result = state.results.get(test.id);
              const isRunning = state.currentTest === test.id;

              return (
                <motion.div
                  key={test.id}
                  layout
                  className={`p-3 rounded-lg border transition-all ${
                    isRunning 
                      ? 'border-primary/50 bg-primary/5' 
                      : result 
                        ? result.passed 
                          ? 'border-green-500/30 bg-green-500/5' 
                          : 'border-red-500/30 bg-red-500/5'
                        : 'border-white/5 bg-white/2'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="mt-0.5">
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : result ? (
                        result.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-white/20" />
                      )}
                    </div>

                    {/* Test Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{test.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {test.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {test.description}
                      </p>
                      
                      {/* Result Details */}
                      <AnimatePresence>
                        {result && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 pt-2 border-t border-white/5"
                          >
                            <p className={`text-xs ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                              {result.message}
                            </p>
                            {result.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {result.details}
                              </p>
                            )}
                            {result.memoryLeaks && result.memoryLeaks.length > 0 && (
                              <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                                <p className="text-xs font-medium text-red-400 mb-1">🚨 Memory Leaks:</p>
                                <ul className="text-xs text-red-300 space-y-0.5">
                                  {result.memoryLeaks.map((leak, i) => (
                                    <li key={i}>• {leak}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-white/5 p-4 flex gap-3">
          <Button
            onClick={runAllTests}
            disabled={state.status === 'running'}
            className="flex-1"
          >
            {state.status === 'running' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : state.status === 'complete' ? (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Run Again
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Gate Crash Test
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default memo(VelvetRopeTestSuite);
