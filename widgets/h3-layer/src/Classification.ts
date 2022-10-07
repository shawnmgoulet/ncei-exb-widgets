import { generateBuckets } from './geobuckets'

type BucketTypeCode = 'EQI' | 'QNT' | 'STD' | 'GPG' | 'APG' | 'JNK'

interface ClassificationProps {
  bucketType?: BucketTypeCode
  numClasses?: number
  data: number[]
  colors?: string[]
  transparency?: number
}

export class Classification {
  bucketType: BucketTypeCode
  numClasses
  ready = false
  data: number[]
  // always one more breakpoint than numClasses
  breakpoints: number[] = []
  transparency: number = 0.2
  colors: number[][] = [
    [255, 255, 178, this.transparency],
    [254, 204, 92, this.transparency],
    [253, 141, 60, this.transparency],
    [240, 59, 32, this.transparency],
    [189, 0, 38, this.transparency]
  ]

  min: number = 0

  max: number = 0

  average: number = 0
  numElements: number = 0

  constructor (props: ClassificationProps) {
    this.bucketType = props.bucketType ?? 'EQI'
    this.numClasses = props.numClasses ?? 5
    if (props.data && props.data.length > 2) {
      this.data = props.data
      // console.log(this.data.sort())
    } else {
      throw new Error('data must be provided')
    }
    if (this.numClasses > this.colors.length) {
      throw new Error('not enough colors defined for the number of classes')
    }
  }

  async load () {
    const breakpoints = await generateBuckets(this.bucketType, this.data, this.numClasses)
    this.breakpoints = breakpoints.map((it: number) => Math.round(it))
    this.min = Math.min(...this.data)
    this.max = Math.max(...this.data)
    this.numElements = this.data.length
    this.average = Math.round(this.data.reduce((a, b) => a + b, 0) / this.numElements)
    this.ready = true
  }

  getColor (value: number) {
    if (!this.ready) { throw new Error('not yet initialized') }
    for (const [idx, breakpoint] of this.breakpoints.entries()) {
      if (value <= breakpoint) {
        return this.colors[idx]
      }
    }
    throw new Error(`value ${value} is out out of range`)
  }

  printBinCounts () {
    const counts = new Array(this.numClasses + 1).fill(0)
    this.data.forEach(value => {
      const idx = this.getBreakpointIndex(value)
      counts[idx]++
    })
    this.breakpoints.forEach((val, idx) => {
      console.log(`breakpoint ${val} has ${counts[idx]} values`)
    })
  }

  private getBreakpointIndex (value: number) {
    for (const [idx, breakpoint] of this.breakpoints.entries()) {
      if (value <= breakpoint) {
        return (idx)
      }
    }
    throw new Error(`value ${value} is out out of range`)
  }
}
