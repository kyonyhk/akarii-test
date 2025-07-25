'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
} from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { useState } from 'react'

export function PromptProposalReview() {
  const proposals = useQuery(api.promptRefinement.getPendingPromptProposals)
  const analytics = useQuery(api.promptRefinement.getPromptRefinementAnalytics)
  const reviewProposal = useMutation(api.promptRefinement.reviewPromptProposal)

  const [reviewingId, setReviewingId] = useState<Id<'promptProposals'> | null>(
    null
  )
  const [reviewNotes, setReviewNotes] = useState('')

  if (!proposals || !analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">Loading prompt proposals...</p>
        </div>
      </div>
    )
  }

  const handleReview = async (
    proposalId: Id<'promptProposals'>,
    decision: 'approved' | 'rejected'
  ) => {
    if (!reviewNotes.trim()) {
      alert('Please provide review notes')
      return
    }

    try {
      await reviewProposal({
        proposalId,
        decision,
        reviewNotes: reviewNotes.trim(),
        reviewerName: 'current_user', // Replace with actual user name
      })
      setReviewingId(null)
      setReviewNotes('')
    } catch (error) {
      console.error('Failed to review proposal:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Prompt Proposal Review
          </h2>
          <p className="text-muted-foreground">
            Review AI-generated prompt improvement suggestions
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {proposals.length} pending review
        </Badge>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">
              {analytics.pendingReview}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {analytics.approved}
            </div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">
              {analytics.rejected}
            </div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {analytics.testing}
            </div>
            <div className="text-sm text-muted-foreground">Testing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">
              {(analytics.averageExpectedImprovement * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg. Expected</div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h3 className="mb-2 text-lg font-semibold">All Caught Up!</h3>
            <p className="text-muted-foreground">
              No prompt proposals pending review at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map(proposal => (
            <Card key={proposal._id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Prompt Improvement Proposal
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant="outline" className="mr-2">
                        {proposal.changeType}
                      </Badge>
                      Expected improvement:{' '}
                      {(proposal.expectedImprovement * 100).toFixed(1)}%
                    </CardDescription>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {new Date(proposal.createdAt).toLocaleString()}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Trigger Information */}
                {proposal.trigger && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Triggered by:</strong>{' '}
                      {proposal.trigger.threshold.name} breach
                      <br />
                      <strong>Breach value:</strong>{' '}
                      {(proposal.trigger.breachValue * 100).toFixed(1)}%
                      <br />
                      <strong>Affected analyses:</strong>{' '}
                      {proposal.trigger.affectedAnalyses.length}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Rationale */}
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4" />
                    Rationale
                  </h4>
                  <p className="rounded bg-muted p-3 text-sm text-muted-foreground">
                    {proposal.rationale}
                  </p>
                </div>

                {/* Evidence Examples */}
                {proposal.evidenceAnalyses.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-medium">
                      <MessageSquare className="h-4 w-4" />
                      Evidence Examples ({proposal.evidenceAnalyses.length})
                    </h4>
                    <div className="space-y-3">
                      {proposal.evidenceAnalyses.map((evidence, idx) => (
                        <div key={idx} className="rounded border bg-red-50 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <Badge variant="destructive" className="text-xs">
                              {(evidence.approvalRate * 100).toFixed(1)}%
                              approval
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ThumbsUp className="h-3 w-3" />
                              {evidence.analysis.thumbsUp}
                              <ThumbsDown className="ml-2 h-3 w-3" />
                              {evidence.analysis.thumbsDown}
                            </div>
                          </div>
                          <p className="mb-1 text-sm font-medium">Message:</p>
                          <p className="mb-2 text-sm text-muted-foreground">
                            &ldquo;{evidence.message?.content.slice(0, 200)}
                            &hellip;&rdquo;
                          </p>
                          <p className="mb-1 text-sm font-medium">
                            Statement Type:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {evidence.analysis.statementType}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proposed Changes */}
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium">
                    <TrendingUp className="h-4 w-4" />
                    Proposed Prompt Changes
                  </h4>
                  <ScrollArea className="h-48 w-full rounded border bg-muted p-3">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {proposal.proposedContent}
                    </pre>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Review Actions */}
                {reviewingId === proposal._id ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Enter your review notes (required)..."
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReview(proposal._id, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!reviewNotes.trim()}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReview(proposal._id, 'rejected')}
                        variant="destructive"
                        disabled={!reviewNotes.trim()}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          setReviewingId(null)
                          setReviewNotes('')
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setReviewingId(proposal._id)}
                      variant="outline"
                    >
                      Start Review
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
