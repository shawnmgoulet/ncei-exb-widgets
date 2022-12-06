/** @jsx jsx */
import {
  AllWidgetProps,
  jsx,
  IMState,
  ReactRedux
} from 'jimu-core'
import { Button, Icon, Tooltip } from 'jimu-ui'
import Extent from 'esri/geometry/Extent'
import SpatialReference from 'esri/geometry/SpatialReference'
import webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import defaultMessages from './translations/default'
// import { Label, Radio, defaultMessages as jimuUIMessages } from 'jimu-ui'
import { IMConfig } from '../config'

const { useSelector } = ReactRedux

interface CoordsObject {
  xmin: number
  ymin: number
  xmax: number
  ymax: number
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  //TODO get URL from Settings panel
  const CSVfileUrl = 'https://noaa.maps.arcgis.com/home/item.html?id=f465861aecac410980a7c601cfec7850'

  // get state for this widget
  const widgetState = useSelector((state: IMState) => {
    return state.widgetsState[props.widgetId]
  })

  const extent = convertExtentToGeographic(widgetState.extent)
  // flag for antimeridian-crossing extent
  const validBbox = extent && (extent.xmin < extent.xmax)
  const queryString = widgetState.queryString ? widgetState?.queryString : '1=1'
  const erddapUrl = buildErddapUrl()

  function convertExtentToGeographic (coords: CoordsObject) {
    const webmercExtent = new Extent({
      xmin: coords.xmin,
      ymin: coords.ymin,
      xmax: coords.xmax,
      ymax: coords.ymax,
      spatialReference: new SpatialReference({ wkid: 102100 })
    })
    return (webMercatorUtils.webMercatorToGeographic(webmercExtent, false) as Extent)
  }

  function buildErddapUrl () {
    // console.log('inside buildErddapUrl. queryString = ', widgetState?.queryString)
    const stdFields = 'ShallowFlag,DatasetID,CatalogNumber,SampleID,ImageURL,Repository,ScientificName,VernacularNameCategory,TaxonRank,IdentificationQualifier,Locality,latitude,longitude,DepthInMeters,DepthMethod,ObservationDate,SurveyID,Station,EventID,SamplingEquipment,LocationAccuracy,RecordType,DataProvider'
    let url = `${props.config.erddapBaseUrl}.html?${stdFields}&latitude>=${extent.ymin.toFixed(4)}&latitude<=${extent.ymax.toFixed(4)}&longitude>=${extent.xmin.toFixed(4)}&longitude<=${extent.xmax.toFixed(4)}`
    if (queryString !== '1=1') {
      url += '&' + convertSqlToErddapParams(queryString)
    }
    return url
  }

  function convertSqlToErddapParams (sql: string) {
    // console.log('inside convertSqlToErddapParams with ', sql)
    const params = []

    // manipulate SQL string into list of 3-element lists (field, operator, value)
    const clauses = sql
      .replace(/\(+?/g, '') // replace left parens
      .replace(/\)+?/g, '') // replace right parens
      .replace(/LOWER/g, '') // remove the LOWER() function
      .split(/ and /i)
      .map(elem => {
        const t = elem.split(/\s+/)
        // construct 3-element array with field, operator, value. Value may have multiple words which need
        // to be rejoined and replace single quotes with double quotes
        return t.slice(0, 2).concat(t.slice(2).join(' ').replace(/'/g, '"'))
      })
    // console.log(clauses)

    // build key/value pairs for specified parameters
    clauses.filter(elem => elem[0].toLowerCase() === 'vernacularnamecategory').forEach(elem => {
      params.push(`VernacularNameCategory=${elem[2]}`)
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'imageurl').forEach(elem => {
      params.push('ImageURL!="NA"')
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'depthinmeters').forEach(elem => {
      params.push(`DepthInMeters ${elem[1]} ${elem[2]}`)
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'scientificname').forEach(elem => {
      params.push(`ScientificName=${elem[2]}`)
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'observationyear').forEach(elem => {
      params.push(`ObservationYear ${elem[1]} ${elem[2]}`)
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'fishcouncilregion').forEach(elem => {
      params.push(`FishCouncilRegion=${elem[2]}`)
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'ocean').forEach(elem => {
      params.push(`Ocean="${findOceanNameByCode(elem[2])}"`)
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'phylum').forEach(elem => {
      params.push(`Phylum=${elem[2]}`)
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'class').forEach(elem => {
      params.push(`Class=${elem[2]}`)
    })

    // Order is a reserved word and renamed in the hosted feature layer
    clauses.filter(elem => elem[0].toLowerCase() === 'order_').forEach(elem => {
      params.push(`Order=${elem[2]}`)
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'family').forEach(elem => {
      params.push(`Family=${elem[2]}`)
    })

    clauses.filter(elem => elem[0].toLowerCase() === 'genus').forEach(elem => {
      params.push(`Genus=${elem[2]}`)
    })

    return params.join('&')
  }

  function findOceanNameByCode (code: string): string {
    const values = {
      0: 'Arctic',
      1: 'Indian',
      2: 'North Atlantic',
      3: 'North Pacific',
      4: 'South Atlantic',
      5: 'South Pacific',
      6: 'Southern'
    }
    return values[code] ? values[code] : ''
  }

  function copyUrlBtn () {
    navigator.clipboard.writeText(erddapUrl).then(() => console.debug('copied to clipboard'))
  }

  return (
    <div className="widget-demo jimu-widget m-2">
      {/* <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'right' }}>
        <TextArea style={{width:"85%"}} readOnly="true" value={erddapUrl} />
        <textarea value={erddapUrl} style={{ width: '85%', height: '250px', overflowY: 'scroll' }} readOnly={true}/>
        <Tooltip placement="top" title="Copy URL to clipboard">
          <Button aria-label="Button" icon onClick={copyUrlBtn} style={{ marginRight: '10px', marginBottom: '10px' }}>
            <Icon icon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M16 10H8.723l1.602 1.602-.707.707L6.808 9.5l2.81-2.81.707.708L8.723 9H16zM3 13h4v-1H3zm8-12v1h2v6h-1V3h-1v1H3V3H2v12h10v-4h1v5H1V2h2V1h2.277a1.984 1.984 0 0 1 3.446 0zm-1 1H8v-.318A.682.682 0 0 0 7.318 1h-.636A.682.682 0 0 0 6 1.682V2H4v1h6zM7 6H3v1h4zm-4 4h2V9H3z"/><path fill="none" d="M0 0h16v16H0z"/></svg>'
            />
          </Button>
        </Tooltip>
      </div> */}
      <div style={{ position: 'absolute', right: '15px' }}>
          <Tooltip placement="top" title="Copy URL to clipboard">
          <Button aria-label="Button" icon onClick={copyUrlBtn}>
            <Icon icon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M16 10H8.723l1.602 1.602-.707.707L6.808 9.5l2.81-2.81.707.708L8.723 9H16zM3 13h4v-1H3zm8-12v1h2v6h-1V3h-1v1H3V3H2v12h10v-4h1v5H1V2h2V1h2.277a1.984 1.984 0 0 1 3.446 0zm-1 1H8v-.318A.682.682 0 0 0 7.318 1h-.636A.682.682 0 0 0 6 1.682V2H4v1h6zM7 6H3v1h4zm-4 4h2V9H3z"/><path fill="none" d="M0 0h16v16H0z"/></svg>'
            />
          </Button>
        </Tooltip>
      </div>
      {validBbox
        ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Tooltip placement="top" title="open ERDDAP console to customize output">
          <Button type="primary" tag="a" href={erddapUrl} target="_blank" style={{ marginRight: '20px' }}>Customize</Button>
        </Tooltip>
        <Tooltip placement="top" title="Download standard CSV file with current filters applied">
          <Button type="primary" tag="a" href={erddapUrl?.replace('deep_sea_corals.html', 'deep_sea_corals.csvp')} target="_blank" >Download</Button>
        </Tooltip>
      </div>
        : <div style={{ width: '80%', alignContent: 'center' }}>
            <p>Warning: missing or invalid spatial extent. Please ensure area of interest does not cross the antimeridian
              (i.e. international date line)</p>
          </div>
    }
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Tooltip placement="top" title="Download the entire database in a CSV format">
          <Button type="primary" tag="a" href={CSVfileUrl} target="_blank" style={{ width: '230px', marginTop: '20px' }}>Download Entire Database</Button>
        </Tooltip>
      </div>

      <div style={{ margin: '20px' }}>
        <span>Note that ERDDAP may take a few minutes to respond to your request</span>
      </div>
    </div>
  )
}
