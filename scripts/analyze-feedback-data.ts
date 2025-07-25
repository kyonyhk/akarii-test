#!/usr/bin/env bun

/**
 * Feedback Data Analysis Script
 *
 * This script analyzes thumb vote feedback data to identify improvement patterns,
 * approval rate trends, and areas where analysis quality is lacking.
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'
import { Analysis, StatementType } from '../types'

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.CONVEX_URL || '')

interface FeedbackAnalysisResult {
  overview: {
    totalAnalyses: number
    totalVotes: number
    overallApprovalRate: number
    engagementRate: number
  }
  approvalRatesByType: Record<
    StatementType,
    {
      total: number
      thumbsUp: number
      thumbsDown: number
      approvalRate: number
      engagementRate: number
    }
  >
  failurePatterns: {
    lowApprovalAnalyses: Array<{
      analysisId: string
      statementType: StatementType
      approvalRate: number
      confidenceLevel: number
      commonIssues: string[]
    }>
    commonFailureReasons: Record<string, number>
    confidenceVsApproval: Array<{
      confidenceRange: string
      avgApprovalRate: number
      count: number
    }>
  }
  trends: {
    dailyApprovalRates: Array<{
      date: string
      approvalRate: number
      totalVotes: number
    }>
    improvementOpportunities: string[]
  }
}

class FeedbackDataAnalyzer {
  private analyses: Analysis[] = []

  async loadAnalysesData(): Promise<void> {
    try {
      // Get all analyses with vote data
      console.log('📊 Loading analyses data from database...')
      const stats = await convex.query(api.analyses.getAnalysisStats, {})

      if (stats.total === 0) {
        console.log(
          '⚠️  No analyses found in database. Creating sample data for analysis...'
        )
        await this.createSampleData()
        return
      }

      // Load actual analyses (would need to implement pagination for large datasets)
      console.log(
        `✅ Found ${stats.total} analyses with ${stats.totalVotes} total votes`
      )
    } catch (error) {
      console.error('❌ Error loading analyses data:', error)
      throw error
    }
  }

  private async createSampleData(): Promise<void> {
    console.log('🔧 Creating sample vote data for analysis...')

    // This would create sample analyses for testing purposes
    const sampleAnalyses: Partial<Analysis>[] = [
      {
        statementType: 'opinion',
        beliefs: ['Users prefer dark mode interfaces'],
        tradeOffs: ['Battery usage vs visual comfort'],
        confidenceLevel: 0.85,
        thumbsUp: 15,
        thumbsDown: 3,
        userVotes: [],
      },
      {
        statementType: 'fact',
        beliefs: ['The API response time is 200ms'],
        tradeOffs: ['Speed vs accuracy'],
        confidenceLevel: 0.95,
        thumbsUp: 8,
        thumbsDown: 1,
        userVotes: [],
      },
      {
        statementType: 'question',
        beliefs: ['Should we implement feature X?'],
        tradeOffs: ['Development time vs user value'],
        confidenceLevel: 0.65,
        thumbsUp: 4,
        thumbsDown: 8,
        userVotes: [],
      },
    ]

    console.log(`📝 Sample data created with ${sampleAnalyses.length} analyses`)
    // In a real implementation, this would insert into the database
    this.analyses = sampleAnalyses as Analysis[]
  }

  async analyzeApprovalRatesByType(): Promise<Record<StatementType, any>> {
    console.log('📈 Analyzing approval rates by statement type...')

    const typeStats: Record<StatementType, any> = {
      question: {
        total: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        approvalRate: 0,
        engagementRate: 0,
      },
      opinion: {
        total: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        approvalRate: 0,
        engagementRate: 0,
      },
      fact: {
        total: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        approvalRate: 0,
        engagementRate: 0,
      },
      request: {
        total: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        approvalRate: 0,
        engagementRate: 0,
      },
      other: {
        total: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        approvalRate: 0,
        engagementRate: 0,
      },
    }

    this.analyses.forEach(analysis => {
      const type = analysis.statementType
      const totalVotes = analysis.thumbsUp + analysis.thumbsDown

      typeStats[type].total += 1
      typeStats[type].thumbsUp += analysis.thumbsUp
      typeStats[type].thumbsDown += analysis.thumbsDown
    })

    // Calculate rates
    Object.keys(typeStats).forEach(type => {
      const stats = typeStats[type as StatementType]
      const totalVotes = stats.thumbsUp + stats.thumbsDown
      stats.approvalRate = totalVotes > 0 ? stats.thumbsUp / totalVotes : 0
      stats.engagementRate = stats.total > 0 ? totalVotes / stats.total : 0
    })

    return typeStats
  }

  async identifyFailurePatterns(): Promise<any> {
    console.log('🔍 Identifying common failure patterns...')

    const lowApprovalThreshold = 0.3 // 30% approval rate
    const lowApprovalAnalyses = this.analyses
      .filter(analysis => {
        const totalVotes = analysis.thumbsUp + analysis.thumbsDown
        const approvalRate = totalVotes > 0 ? analysis.thumbsUp / totalVotes : 0
        return approvalRate < lowApprovalThreshold && totalVotes >= 3 // At least 3 votes
      })
      .map(analysis => {
        const totalVotes = analysis.thumbsUp + analysis.thumbsDown
        const approvalRate = analysis.thumbsUp / totalVotes

        // Identify common issues based on patterns
        const commonIssues = []
        if (analysis.confidenceLevel > 0.8 && approvalRate < 0.3) {
          commonIssues.push('Overconfident incorrect analysis')
        }
        if (analysis.beliefs.length === 0) {
          commonIssues.push('Missing belief extraction')
        }
        if (analysis.tradeOffs.length === 0) {
          commonIssues.push('Missing trade-off analysis')
        }
        if (analysis.statementType === 'other') {
          commonIssues.push('Unclear statement classification')
        }

        return {
          analysisId: analysis._id,
          statementType: analysis.statementType,
          approvalRate,
          confidenceLevel: analysis.confidenceLevel,
          commonIssues,
        }
      })

    // Analyze confidence vs approval correlation
    const confidenceRanges = [
      { min: 0, max: 0.5, label: 'Low (0-50%)' },
      { min: 0.5, max: 0.7, label: 'Medium (50-70%)' },
      { min: 0.7, max: 0.9, label: 'High (70-90%)' },
      { min: 0.9, max: 1.0, label: 'Very High (90-100%)' },
    ]

    const confidenceVsApproval = confidenceRanges.map(range => {
      const analysesInRange = this.analyses.filter(
        a => a.confidenceLevel >= range.min && a.confidenceLevel < range.max
      )

      const totalApprovalRate = analysesInRange.reduce((sum, analysis) => {
        const totalVotes = analysis.thumbsUp + analysis.thumbsDown
        return sum + (totalVotes > 0 ? analysis.thumbsUp / totalVotes : 0)
      }, 0)

      return {
        confidenceRange: range.label,
        avgApprovalRate:
          analysesInRange.length > 0
            ? totalApprovalRate / analysesInRange.length
            : 0,
        count: analysesInRange.length,
      }
    })

    return {
      lowApprovalAnalyses,
      confidenceVsApproval,
      commonFailureReasons: this.analyzeFailureReasons(lowApprovalAnalyses),
    }
  }

  private analyzeFailureReasons(
    lowApprovalAnalyses: any[]
  ): Record<string, number> {
    const reasons: Record<string, number> = {}

    lowApprovalAnalyses.forEach(analysis => {
      analysis.commonIssues.forEach((issue: string) => {
        reasons[issue] = (reasons[issue] || 0) + 1
      })
    })

    return reasons
  }

  async generateImprovementRecommendations(): Promise<string[]> {
    console.log('💡 Generating improvement recommendations...')

    const recommendations = []

    // Analyze the patterns and suggest improvements
    const approvalRates = await this.analyzeApprovalRatesByType()

    // Find the lowest performing statement types
    const sortedTypes = Object.entries(approvalRates).sort(
      ([, a], [, b]) => a.approvalRate - b.approvalRate
    )

    if (sortedTypes.length > 0) {
      const [lowestType, lowestStats] = sortedTypes[0]
      if (lowestStats.approvalRate < 0.5) {
        recommendations.push(
          `Improve ${lowestType} analysis accuracy (current approval: ${(lowestStats.approvalRate * 100).toFixed(1)}%)`
        )
      }
    }

    // Check for confidence calibration issues
    const failurePatterns = await this.identifyFailurePatterns()
    const highConfidenceLowApproval = failurePatterns.confidenceVsApproval.find(
      (range: any) =>
        range.confidenceRange.includes('High') && range.avgApprovalRate < 0.4
    )

    if (highConfidenceLowApproval) {
      recommendations.push(
        'Calibrate confidence scoring - high confidence analyses receiving low approval'
      )
    }

    // Analyze common failure reasons
    const topFailures = Object.entries(
      failurePatterns.commonFailureReasons as Record<string, number>
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)

    topFailures.forEach(([reason, count]) => {
      recommendations.push(`Address "${reason}" - affecting ${count} analyses`)
    })

    return recommendations
  }

  async generateReport(): Promise<FeedbackAnalysisResult> {
    console.log('📋 Generating comprehensive feedback analysis report...')

    const approvalRatesByType = await this.analyzeApprovalRatesByType()
    const failurePatterns = await this.identifyFailurePatterns()
    const improvements = await this.generateImprovementRecommendations()

    // Calculate overall metrics
    const totalVotes = this.analyses.reduce(
      (sum, a) => sum + a.thumbsUp + a.thumbsDown,
      0
    )
    const totalThumbsUp = this.analyses.reduce((sum, a) => sum + a.thumbsUp, 0)
    const overallApprovalRate = totalVotes > 0 ? totalThumbsUp / totalVotes : 0
    const engagementRate =
      this.analyses.length > 0 ? totalVotes / this.analyses.length : 0

    return {
      overview: {
        totalAnalyses: this.analyses.length,
        totalVotes,
        overallApprovalRate,
        engagementRate,
      },
      approvalRatesByType,
      failurePatterns,
      trends: {
        dailyApprovalRates: [], // Would implement time-based analysis
        improvementOpportunities: improvements,
      },
    }
  }

  async exportToJson(filename: string, data: any): Promise<void> {
    const fs = await import('fs')
    await fs.promises.writeFile(filename, JSON.stringify(data, null, 2))
    console.log(`📁 Report exported to ${filename}`)
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Feedback Data Analysis...\n')

  try {
    const analyzer = new FeedbackDataAnalyzer()

    // Load and analyze data
    await analyzer.loadAnalysesData()
    const report = await analyzer.generateReport()

    // Display results
    console.log('\n📊 FEEDBACK ANALYSIS RESULTS')
    console.log('================================\n')

    console.log('📈 OVERVIEW:')
    console.log(`  Total Analyses: ${report.overview.totalAnalyses}`)
    console.log(`  Total Votes: ${report.overview.totalVotes}`)
    console.log(
      `  Overall Approval Rate: ${(report.overview.overallApprovalRate * 100).toFixed(1)}%`
    )
    console.log(
      `  Average Engagement: ${report.overview.engagementRate.toFixed(1)} votes/analysis\n`
    )

    console.log('📊 APPROVAL RATES BY TYPE:')
    Object.entries(report.approvalRatesByType).forEach(([type, stats]) => {
      console.log(
        `  ${type.toUpperCase()}: ${(stats.approvalRate * 100).toFixed(1)}% (${stats.thumbsUp}/${stats.thumbsUp + stats.thumbsDown} votes, ${stats.total} analyses)`
      )
    })

    console.log('\n🔍 FAILURE PATTERNS:')
    console.log(
      `  Low Approval Analyses: ${report.failurePatterns.lowApprovalAnalyses.length}`
    )
    console.log('  Confidence vs Approval Analysis:')
    report.failurePatterns.confidenceVsApproval.forEach(range => {
      console.log(
        `    ${range.confidenceRange}: ${(range.avgApprovalRate * 100).toFixed(1)}% approval (${range.count} analyses)`
      )
    })

    console.log('\n💡 IMPROVEMENT OPPORTUNITIES:')
    report.trends.improvementOpportunities.forEach((opp, idx) => {
      console.log(`  ${idx + 1}. ${opp}`)
    })

    // Export detailed report
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `./reports/feedback-analysis-${timestamp}.json`
    await analyzer.exportToJson(filename, report)

    console.log('\n✅ Analysis complete!')
  } catch (error) {
    console.error('❌ Analysis failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}

export { FeedbackDataAnalyzer, type FeedbackAnalysisResult }
