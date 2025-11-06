import React from 'react'
import { createRoot } from 'react-dom/client'
import KPI from './components/KPI'
import { callFn } from './api'
import {
  CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis
} from 'recharts'

function useAsync(d=null){
  const [data,setData]=React.useState(d),
        [loading,setLoading]=React.useState(false),
        [err,setErr]=React.useState(null);
  return {
    data, loading, err,
    async run(p){
      try { setLoading(true); setErr(null); setData(await p) }
      catch(x){ setErr(x.message||String(x)) }
      finally { setLoading(false) }
    }
  };
}

const App=()=>{
  const [assets,setAssets]=React.useState([
    {id:'solar-1',type:'solar',efficiencyHist:[0.92,0.91,0.90,0.89], env:{tempC:42}, envHist:{tempC:[35,37,39,41]}},
    {id:'wind-2', type:'wind', efficiencyHist:[0.88,0.885,0.882,0.879], env:{windSpeed:15}, envHist:{windSpeed:[9,12,14,16]}}
  ]);

  const risk=useAsync(), ttm=useAsync(), corr=useAsync();
  const avgEff=(assets.reduce((s,a)=>s+(a.efficiencyHist?.at(-1)||0),0)/assets.length).toFixed(3);

  return (
    <div className='wrap'>

      {/* Title */}
      <div className='title'>
        <div>
          <h1>Predictive Maintenance — Dashboard</h1>
          <div className='sub'>Risk, time-to-maintenance and env correlations.</div>
        </div>
        <div className='toolbar'>
          <button className='btn' onClick={()=>risk.run(callFn('asset_predictive_maintenance',{assets}))}>Score Risk</button>
          <button className='btn' onClick={()=>ttm.run(callFn('asset_ttm_forecast',{assets}))}>TTM Forecast</button>
          <button className='btn' onClick={()=>corr.run(callFn('asset_env_correlation',{assets}))}>Correlate</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className='kpis'>
        <KPI label='Assets' value={assets.length}/>
        <KPI label='Avg Efficiency (last)' value={avgEff}/>
        <KPI label='History Points' value={assets[0].efficiencyHist.length}/>
        <KPI label='Editable' value='Yes' hint='Modify inputs below'/>
      </div>

      <div className='grid' style={{marginTop:16}}>
        {/* Left column – assets editor */}
        <div className='leftcol'>
          <div className='card'>
            <h3>Assets</h3>

            {assets.map((a,i)=>(
              <div key={i} className='asset'>
                <div className='row'>
                  <input className='small' value={a.id}
                    onChange={e=>{
                      const n=assets.slice(); n[i]={...n[i], id:e.target.value}; setAssets(n);
                    }}/>
                  <select className='type' value={a.type}
                    onChange={e=>{
                      const n=assets.slice(); n[i]={...n[i], type:e.target.value}; setAssets(n);
                    }}>
                    <option value='solar'>solar</option>
                    <option value='wind'>wind</option>
                  </select>

                  <button className='btn btn-danger'
                          onClick={()=>setAssets(assets.filter((_,k)=>k!==i))}>
                    Remove
                  </button>
                </div>

                <label>Efficiency History (comma)</label>
                <input
                  value={(a.efficiencyHist||[]).join(',')}
                  onChange={e=>{
                    const n=assets.slice();
                    n[i]={...n[i],
                      efficiencyHist:e.target.value.split(',').map(x=>Number(x.trim())).filter(x=>!Number.isNaN(x))
                    };
                    setAssets(n);
                  }}
                />

                <label>Env History ({a.type==='solar'?'tempC':'windSpeed'}, comma)</label>
                <input
                  value={a.type==='solar'?(a.envHist?.tempC||[]).join(','):(a.envHist?.windSpeed||[]).join(',')}
                  onChange={e=>{
                    const n=assets.slice();
                    n[i] = {
                      ...n[i],
                      envHist: a.type==='solar'
                        ? { tempC: e.target.value.split(',').map(v=>+v) }
                        : { windSpeed: e.target.value.split(',').map(v=>+v) }
                    };
                    setAssets(n);
                  }}
                />
              </div>
            ))}

            <div className='row'>
              <button className='btn'
                onClick={()=>setAssets([...assets,{id:`asset-${assets.length+1}`,type:'solar',efficiencyHist:[0.9,0.89,0.88]}])}>
                Add Asset
              </button>
            </div>
          </div>
        </div>

        {/* Right column – results */}
        <div className='rightcol'>

          <div className='card col-span-12'>
            <h3>Risk Scores</h3>
            {risk.data
              ? (
                <table>
                  <thead>
                    <tr><th>ID</th><th>Failure Prob.</th><th>Drop %/period</th></tr>
                  </thead>
                  <tbody>
                    {risk.data.assets.map(x=>(
                      <tr key={x.id}>
                        <td>{x.id}</td>
                        <td>{(x.failure_probability*100).toFixed(1)}%</td>
                        <td>{x.expected_drop_pct_per_period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
              : <div className='muted'>Click “Score Risk” to fetch.</div>
            }
          </div>

          <div className='card col-span-6'>
            <h3>TTM Forecast (days)</h3>
            {ttm.data
              ? (
                <ResponsiveContainer width='100%' height={260}>
                  <BarChart data={ttm.data.forecast}>
                    <CartesianGrid stroke='rgba(160,255,80,0.15)' strokeDasharray='3 3'/>
                    <XAxis dataKey='id' tick={{fill:'#8fdea1',fontSize:12}}/>
                    <YAxis tick={{fill:'#8fdea1',fontSize:12}}/>
                    <Tooltip />
                    <Legend />
                    <Bar dataKey='ttm_days' fill='#a6ff55'/>
                  </BarChart>
                </ResponsiveContainer>
              )
              : <div className='muted'>Click “TTM Forecast”.</div>
            }
          </div>

          <div className='card col-span-6'>
            <h3>Env Correlations</h3>
            {corr.data
              ? <pre style={{margin:0,whiteSpace:'pre-wrap'}}>{JSON.stringify(corr.data,null,2)}</pre>
              : <div className='muted'>Click “Correlate”.</div>
            }
          </div>

        </div>
      </div>
    </div>
  )
};

createRoot(document.getElementById('root')).render(<App/>)
