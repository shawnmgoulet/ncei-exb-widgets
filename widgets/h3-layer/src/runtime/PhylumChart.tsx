/** @jsx jsx */

import { useEffect, useRef } from 'react'
import { React, jsx } from 'jimu-core'
import * as Plot from "@observablehq/plot"
import { DSVRowArray } from 'd3'
import PieChart from './PieChart'
import './PhylumChart.css'

interface PhylumData {
  Phylum: string
  Count: number
}

export default function PhylumChart ({ data }: {data: DSVRowArray<string>}) {
  const chartNodeRef = useRef<HTMLDivElement>(null)

  // derived from https://github.com/observablehq/plot-create-react-app-example
  useEffect(() => {
    if (!data) { return }
    let chart
    // const chart = Plot.barX(data, {x: "Count", y: "Phylum"}).plot()
    if (data.length > 1) {
      chart = PieChart(data, {
        name: d => d.Phylum,
        value: d => d.Count,
        width: 150,
        height: 150
      })
    } else {
      chart = document.createElement('span').appendChild(document.createTextNode(`100% ${data[0].Phylum}`))
    }
    chartNodeRef.current?.append(chart)

    return () => {
      // or else you'll get a chart for each re-render!
      chart.remove()
    }
  }, [data])

  return (
    <div className={'container'}>
    <main className={'item'} ref={chartNodeRef}></main>
    </div>
  )
}
