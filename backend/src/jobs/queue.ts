import { EventEmitter } from 'events'

interface Job {
  id:          string
  name:        string
  data:        any
  attempts:    number
  maxAttempts: number
}

type JobHandler = (job: Job) => Promise<any>

class SimpleQueue {
  private queueName:  string
  private jobs:       Job[] = []
  private processing: boolean = false
  private handler:    JobHandler | null = null
  private emitter:    EventEmitter = new EventEmitter()

  constructor(name: string) {
    this.queueName = name
  }

  async add(name: string, data: any, opts?: { attempts?: number }): Promise<Job> {
    const job: Job = {
      id:          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      data,
      attempts:    0,
      maxAttempts: opts?.attempts || 3,
    }
    this.jobs.push(job)
    setImmediate(() => this.processNext())
    return job
  }

  process(_name: string, handler: JobHandler): void {
    this.handler = handler
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.emitter.on(event, listener)
    return this
  }

  schedule(intervalMs: number, name: string, data: any = {}): void {
    setInterval(() => this.add(name, data), intervalMs)
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.jobs.length === 0 || !this.handler) return
    this.processing = true

    const job = this.jobs.shift()!
    job.attempts++

    try {
      const result = await this.handler(job)
      this.emitter.emit('completed', job, result)
    } catch (err: any) {
      if (job.attempts < job.maxAttempts) {
        const delay = Math.pow(2, job.attempts) * 1000
        setTimeout(() => {
          this.jobs.unshift(job)
          this.processNext()
        }, delay)
      } else {
        this.emitter.emit('failed', job, err)
        console.error(`[Queue:${this.queueName}] Job failed after ${job.attempts} attempts:`, err.message)
      }
    } finally {
      this.processing = false
      if (this.jobs.length > 0) setImmediate(() => this.processNext())
    }
  }
}

export const poolGenerationQueue = new SimpleQueue('pool-generation')
export const gapAnalysisQueue    = new SimpleQueue('gap-analysis')
export const jwtCleanupQueue     = new SimpleQueue('jwt-cleanup')