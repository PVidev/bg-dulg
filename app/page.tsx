'use client'

import { useEffect, useState, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import styles from './page.module.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DebtData {
  totalDebt: number
  population: number
  perPerson: number
  year: string
  month?: string
  date?: string
  currency: string
  success: boolean
  error?: string
  details?: string
  dataSource?: string
  warning?: string
  isRealTime?: boolean
  isNewerData?: boolean
  dataYear?: string
}

interface HistoryPoint {
  year: string
  debt: number
  perPerson: number
  population?: number
}

type Currency = 'EUR' | 'BGN'

export default function Home() {
  const [data, setData] = useState<DebtData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [isAnimating, setIsAnimating] = useState(false)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [realTimeDebt, setRealTimeDebt] = useState<number | null>(null)
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [changeAmount, setChangeAmount] = useState(0)
  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [userIP, setUserIP] = useState<string>('Зареждане...')
  const [userOS, setUserOS] = useState<string>('')
  const [userBrowser, setUserBrowser] = useState<string>('')
  const [realTimePopulation, setRealTimePopulation] = useState<number | null>(null)
  const [populationChange, setPopulationChange] = useState<{type: 'birth' | 'death', count: number} | null>(null)
  const [todayStats, setTodayStats] = useState({births: 0, deaths: 0, netChange: 0})
  const populationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showInfoMenu, setShowInfoMenu] = useState(false)

  // Курсове на валути (приблизителни, може да се вземат от API)
  const EXCHANGE_RATES = {
    USD_TO_EUR: 0.92, // 1 USD = 0.92 EUR
    USD_TO_BGN: 1.80, // 1 USD = 1.80 BGN (приблизително)
    EUR_TO_BGN: 1.95583 // 1 EUR = 1.95583 BGN (фиксиран курс)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/debt')
      
      if (!response.ok) {
        throw new Error(`HTTP грешка: ${response.status}`)
      }
      
      const result: DebtData = await response.json()

      if (!result.success) {
        // Запазваме резултата за да покажем details ако има
        setData(result)
        throw new Error(result.error || 'Грешка при зареждане на данни')
      }

      setData(result)
      setLastUpdate(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неочаквана грешка'
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/debt/history')
      const result = await response.json()
      if (result.success && result.history) {
        setHistory(result.history)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  // Функция за определяне на OS и браузър
  const detectSystemInfo = () => {
    const userAgent = navigator.userAgent
    
    // Определяне на OS
    let os = 'Unknown'
    if (userAgent.indexOf('Win') !== -1) os = 'Windows'
    else if (userAgent.indexOf('Mac') !== -1) os = 'macOS'
    else if (userAgent.indexOf('Linux') !== -1) os = 'Linux'
    else if (userAgent.indexOf('Android') !== -1) os = 'Android'
    else if (userAgent.indexOf('iOS') !== -1) os = 'iOS'
    
    // Определяне на браузър
    let browser = 'Unknown'
    if (userAgent.indexOf('Chrome') !== -1 && userAgent.indexOf('Edg') === -1 && userAgent.indexOf('OPR') === -1) {
      browser = 'Chrome'
    } else if (userAgent.indexOf('Firefox') !== -1) {
      browser = 'Firefox'
    } else if (userAgent.indexOf('Safari') !== -1 && userAgent.indexOf('Chrome') === -1) {
      browser = 'Safari'
    } else if (userAgent.indexOf('Edg') !== -1) {
      browser = 'Edge'
    } else if (userAgent.indexOf('OPR') !== -1 || userAgent.indexOf('Opera') !== -1) {
      browser = 'Opera'
    } else if (userAgent.indexOf('Brave') !== -1) {
      browser = 'Brave'
    } else if (userAgent.indexOf('Tor') !== -1) {
      browser = 'Tor Browser'
    }
    
    setUserOS(os)
    setUserBrowser(browser)
  }

  // Функция за получаване на IP адрес
  const fetchUserIP = async () => {
    try {
      // Опитваме се с няколко безплатни IP API услуги
      const apis = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://api.ip.sb/ip'
      ]
      
      for (const api of apis) {
        try {
          const response = await fetch(api, { cache: 'no-store' })
          if (response.ok) {
            const data = await response.json()
            const ip = data.ip || data.query || data
            if (ip) {
              setUserIP(ip)
              return
            }
          }
        } catch (e) {
          continue
        }
      }
      
      setUserIP('Не е наличен')
    } catch (error) {
      console.error('Error fetching IP:', error)
      setUserIP('Не е наличен')
    }
  }

  useEffect(() => {
    fetchData()
    fetchHistory()
    detectSystemInfo()
    fetchUserIP()
    
    // Автоматично обновяване на всеки час
    const interval = setInterval(fetchData, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Симулация на реално време промени за населението
  useEffect(() => {
    if (!data || loading) return

    // Инициализираме с текущото население
    setRealTimePopulation(data.population)
    setTodayStats({births: 0, deaths: 0, netChange: 0})

    // Статистика за България (приблизителни средни стойности):
    // Раждаемост: ~9.5 на 1000 души годишно
    // Смъртност: ~15.5 на 1000 души годишно
    // Нетна промяна: ~-6 на 1000 годишно (намаляване)
    // За ~6.8 милиона души: ~65 раждания/ден, ~105 смъртни случая/ден
    
    const birthRate = 9.5 / 1000 / 365 // раждания на ден на човек
    const deathRate = 15.5 / 1000 / 365 // смъртни случаи на ден на човек
    
    const simulatePopulationChange = () => {
      setRealTimePopulation(prevPop => {
        if (prevPop === null || !data) return prevPop

        // Изчисляваме вероятността за раждане или смърт
        const population = prevPop
        const birthsPerSecond = (population * birthRate) / 86400 // на секунда
        const deathsPerSecond = (population * deathRate) / 86400 // на секунда
        
        // Симулираме събития на базата на вероятностите
        const random = Math.random()
        const totalRate = birthsPerSecond + deathsPerSecond
        
        if (random < birthsPerSecond / totalRate && birthsPerSecond > 0) {
          // Раждане
          const newPop = Math.round(population + 1)
          setPopulationChange({type: 'birth', count: 1})
          setTodayStats(prev => ({
            births: prev.births + 1,
            deaths: prev.deaths,
            netChange: prev.netChange + 1
          }))
          // Изчистваме индикатора след 2 секунди
          setTimeout(() => setPopulationChange(null), 2000)
          return newPop
        } else if (random < (birthsPerSecond + deathsPerSecond) / totalRate && deathsPerSecond > 0) {
          // Смърт
          const newPop = Math.round(population - 1)
          setPopulationChange({type: 'death', count: 1})
          setTodayStats(prev => ({
            births: prev.births,
            deaths: prev.deaths + 1,
            netChange: prev.netChange - 1
          }))
          // Изчистваме индикатора след 2 секунди
          setTimeout(() => setPopulationChange(null), 2000)
          return newPop
        }
        
        return prevPop
      })
    }

    // Симулираме промени на всеки 2-8 секунди (реалистично за раждания/смъртни случаи)
    populationIntervalRef.current = setInterval(() => {
      const delay = 2000 + Math.random() * 6000 // 2-8 секунди
      setTimeout(simulatePopulationChange, delay)
    }, 5000)

    return () => {
      if (populationIntervalRef.current) {
        clearInterval(populationIntervalRef.current)
      }
    }
  }, [data, loading])

  // Симулация на реално време промени
  useEffect(() => {
    if (!data || loading) return

    // Инициализираме с текущия дълг
    setRealTimeDebt(data.totalDebt)
    setChangeAmount(0)
    setTrend('stable')

    // Симулираме промени на всеки 3-10 секунди
    const simulateChange = () => {
      setRealTimeDebt(prevDebt => {
        if (prevDebt === null || !data) return prevDebt

        // Случайна промяна между -0.1% и +0.15% (реалистично)
        const changePercent = (Math.random() * 0.0025 - 0.001) // -0.1% до +0.15%
        const change = prevDebt * changePercent
        const newDebt = prevDebt + change

        setChangeAmount(change)
        setTrend(change > 0 ? 'up' : change < 0 ? 'down' : 'stable')

        // Обновяваме историята с новата точка
        setHistory(prevHistory => {
          if (prevHistory.length === 0) return prevHistory
          
          const lastPoint = prevHistory[prevHistory.length - 1]
          const currentYear = new Date().getFullYear()
          const newHistory = [...prevHistory]
          
          // Ако последната точка е от текущата година, обновяваме я
          if (lastPoint.year === currentYear.toString()) {
            newHistory[newHistory.length - 1] = {
              year: currentYear.toString(),
              debt: newDebt,
              perPerson: newDebt / data.population
            }
          } else {
            // Иначе добавяме нова точка
            newHistory.push({
              year: currentYear.toString(),
              debt: newDebt,
              perPerson: newDebt / data.population
            })
          }
          
          return newHistory
        })

        return newDebt
      })
    }

    // Първа промяна след 3 секунди
    const firstTimeout = setTimeout(simulateChange, 3000)

    // След това на всеки 5-12 секунди
    realTimeIntervalRef.current = setInterval(() => {
      const delay = 5000 + Math.random() * 7000 // 5-12 секунди
      setTimeout(simulateChange, delay)
    }, 8000)

    return () => {
      clearTimeout(firstTimeout)
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current)
      }
    }
  }, [data, loading])

  // Автоматична смяна на валути: EUR -> BGN -> EUR (на всеки 5 секунди)
  useEffect(() => {
    if (!data || loading) return

    const currencyInterval = setInterval(() => {
      setIsAnimating(true)
      
      setTimeout(() => {
        setCurrency(prev => prev === 'EUR' ? 'BGN' : 'EUR')
        setIsAnimating(false)
      }, 300) // Продължителност на анимацията
    }, 5000) // Смяна на всеки 5 секунди

    return () => clearInterval(currencyInterval)
  }, [data, loading])

  // Конвертиране на сума от USD към избраната валута
  const convertCurrency = (usdAmount: number, targetCurrency: Currency): number => {
    if (targetCurrency === 'EUR') {
      return usdAmount * EXCHANGE_RATES.USD_TO_EUR
    } else {
      return usdAmount * EXCHANGE_RATES.USD_TO_BGN
    }
  }

  const formatNumber = (num: number, decimals: number = 0): string => {
    return new Intl.NumberFormat('bg-BG', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    }).format(num)
  }

  const formatCurrency = (num: number, targetCurrency: Currency, decimals: number = 2): string => {
    if (targetCurrency === 'BGN') {
      return new Intl.NumberFormat('bg-BG', {
        style: 'currency',
        currency: 'BGN',
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals
      }).format(num)
    } else {
      return new Intl.NumberFormat('bg-BG', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals
      }).format(num)
    }
  }

  const getCurrencySymbol = (curr: Currency): string => {
    return curr === 'BGN' ? 'лв' : '€'
  }

  // Подготвяме данните за графиката на дълга
  const chartData = history.length > 0 ? {
    labels: history.map(h => h.year),
    datasets: [
      {
        label: 'Дълг на човек',
        data: history.map(h => convertCurrency(h.perPerson, currency)),
        borderColor: currency === 'EUR' ? '#60a5fa' : '#8b5cf6',
        backgroundColor: currency === 'EUR' 
          ? 'rgba(96, 165, 250, 0.1)' 
          : 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: currency === 'EUR' ? '#60a5fa' : '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        animation: {
          duration: 750
        }
      }
    ]
  } : null

  // Подготвяме данните за графиката на населението
  const hasPopulationData = history.length > 0 && history.some(h => h.population)
  const populationChartData = hasPopulationData ? {
    labels: history.map(h => h.year),
    datasets: [
      {
        label: 'Население',
        data: history.map(h => h.population || 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        animation: {
          duration: 750
        }
      }
    ]
  } : null

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `${formatCurrency(context.parsed.y, currency)}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(59, 130, 246, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(59, 130, 246, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11
          },
          callback: function(value: any) {
            return formatCurrency(value, currency, 0)
          }
        }
      }
    }
  }

  const populationChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `${formatNumber(context.parsed.y)} души`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(16, 185, 129, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(16, 185, 129, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11
          },
          callback: function(value: any) {
            return formatNumber(value) + ' души'
          }
        }
      }
    }
  }

  // Изчисляваме текущия дълг (реално време или статичен)
  const currentDebt = realTimeDebt !== null ? realTimeDebt : (data?.totalDebt || 0)
  // Използваме реалното население в реално време, ако е налично
  const currentPopulation = realTimePopulation !== null ? realTimePopulation : (data?.population || 0)
  const currentPerPerson = data && currentPopulation > 0 ? currentDebt / currentPopulation : 0

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Външен дълг на България</h1>
          <p className={styles.subtitle}>
            Колко трябва да върне всеки гражданин за да се изплати дългът?
          </p>
        </header>

        {loading && !data && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Зареждане на данни...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>⚠️ {error}</p>
            {data?.details && (
              <p className={styles.errorDetails}>{data.details}</p>
            )}
            <button onClick={fetchData} className={styles.retryButton}>
              Опитай отново
            </button>
          </div>
        )}

        {data && !loading && (
          <div className={styles.dataContainer}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Общ външен дълг</div>
              <div className={`${styles.statValue} ${isAnimating ? styles.fadeOut : styles.fadeIn} ${trend === 'up' ? styles.trendUp : trend === 'down' ? styles.trendDown : ''}`}>
                {formatCurrency(convertCurrency(currentDebt, currency), currency, 0)}
              </div>
              <div className={styles.statSubtext}>
                {currency === 'BGN' ? 'Български лева' : 'Евро'}
                {changeAmount !== 0 && (
                  <span className={trend === 'up' ? styles.changeUp : styles.changeDown}>
                    {' '}
                    {trend === 'up' ? '↑' : '↓'} {formatCurrency(Math.abs(convertCurrency(changeAmount, currency)), currency, 0)}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Население</div>
              <div className={`${styles.statValue} ${populationChange ? (populationChange.type === 'birth' ? styles.populationUp : styles.populationDown) : ''}`}>
                {formatNumber(realTimePopulation !== null ? realTimePopulation : data.population)} души
              </div>
              {populationChange && (
                <div className={styles.populationChange}>
                  <span className={populationChange.type === 'birth' ? styles.birthIndicator : styles.deathIndicator}>
                    {populationChange.type === 'birth' ? '👶 +' : '💀 -'}{populationChange.count}
                  </span>
                </div>
              )}
              <div className={styles.populationStats}>
                <div className={styles.statRow}>
                  <span className={styles.statLabelSmall}>Раждания днес:</span>
                  <span className={styles.statValueSmall}>+{todayStats.births}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabelSmall}>Смъртни случаи днес:</span>
                  <span className={styles.statValueSmall}>-{todayStats.deaths}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabelSmall}>Нетна промяна:</span>
                  <span className={todayStats.netChange >= 0 ? styles.statValueSmallPositive : styles.statValueSmallNegative}>
                    {todayStats.netChange >= 0 ? '+' : ''}{todayStats.netChange}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.statCard + ' ' + styles.highlight}>
              <div className={styles.statLabel}>Дълг на човек</div>
              <div className={`${styles.statValue} ${styles.highlightValue} ${isAnimating ? styles.fadeOut : styles.fadeIn} ${trend === 'up' ? styles.trendUp : trend === 'down' ? styles.trendDown : ''}`}>
                {formatCurrency(convertCurrency(currentPerPerson, currency), currency)}
              </div>
              <div className={styles.statSubtext}>
                Това е сумата, която всеки гражданин трябва да върне
              </div>
              <div className={styles.currencyIndicator}>
                <span className={currency === 'EUR' ? styles.active : ''}>€</span>
                <span className={styles.separator}>|</span>
                <span className={currency === 'BGN' ? styles.active : ''}>лв</span>
              </div>
            </div>

            {history.length > 0 && chartData && (
              <>
                <div className={styles.chartCard}>
                  <div className={styles.chartHeader}>
                    <h3 className={styles.chartTitle}>Развитие на дълга през годините</h3>
                    <div className={styles.realTimeIndicator}>
                      <span className={styles.realTimeDot}></span>
                      Реално време
                    </div>
                  </div>
                  <div className={styles.chartContainer}>
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>

                {hasPopulationData && populationChartData && (
                  <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                      <h3 className={styles.chartTitle}>Развитие на населението през годините</h3>
                      <div className={styles.realTimeIndicator}>
                        <span className={styles.realTimeDot}></span>
                        Реално време
                      </div>
                    </div>
                    <div className={styles.chartContainer}>
                      <Line data={populationChartData} options={populationChartOptions} />
                    </div>
                  </div>
                )}
              </>
            )}

            {data.warning && (
              <div className={styles.warningBox}>
                <p>ℹ️ {data.warning}</p>
              </div>
            )}

            {data.isNewerData && data.dataYear && parseInt(data.dataYear) >= new Date().getFullYear() && (
              <div className={styles.newDataBox}>
                <p>✨ Автоматично открити нови данни за {data.dataYear}!</p>
              </div>
            )}

            <div className={styles.metaInfo}>
              {lastUpdate && (
                <p className={styles.updateInfo}>
                  Последно обновяване: {lastUpdate.toLocaleTimeString('bg-BG')}
                </p>
              )}
              <p className={styles.userInfo}>
                Твоето IP: <strong>{userIP}</strong>
              </p>
              {userOS && (
                <p className={styles.userInfo}>
                  Система: <strong>{userOS}</strong>
                </p>
              )}
              {userBrowser && (
                <p className={styles.userInfo}>
                  Клиент: <strong>{userBrowser}</strong>
                </p>
              )}
              <p className={styles.sourceInfo}>
                Изработен от{' '}
                <a 
                  href="https://pvidev.dev/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.devLink}
                >
                  PVidev Dev.
                </a>
              </p>
              
              <button 
                onClick={() => setShowInfoMenu(!showInfoMenu)}
                className={styles.infoButton}
              >
                {showInfoMenu ? '▼' : '▶'} Информация за данните и изчисленията
              </button>
            </div>

            {showInfoMenu && (
              <div className={styles.infoMenu}>
                <div className={styles.infoSection}>
                  <h3 className={styles.infoTitle}>📊 Откъде се взимат данните?</h3>
                  <div className={styles.infoContent}>
                    <h4>1. Външен дълг:</h4>
                    <ul>
                      <li><strong>БНБ (Българска народна банка)</strong> - месечни данни (най-актуални)</li>
                      <li><strong>Месечни данни от Excel файл</strong> - извлечени от официални БНБ отчети (август 2024, декември 2024, юли 2025, август 2025)</li>
                      <li><strong>World Bank API</strong> - годишни данни (DT.DOD.DECT.CD индикатор) за исторически данни</li>
                      <li><strong>Fallback данни</strong> - последни известни данни от БНБ (август 2025 - 53,605.9 млн. EUR)</li>
                    </ul>
                    
                    <h4>2. Население:</h4>
                    <ul>
                      <li><strong>World Bank API</strong> - SP.POP.TOTL индикатор</li>
                      <li><strong>Автоматично обновяване</strong> - търси данни до текущата година + 1</li>
                      <li><strong>Приблизителна стойност</strong> - ~6.8 милиона души (2025)</li>
                    </ul>
                    
                    <h4>3. Източници на месечните данни:</h4>
                    <ul>
                      <li><strong>Excel файл</strong>: <code>data/s_ged_press_a2_bg.xlsx</code> - официален БНБ отчет</li>
                      <li><strong>PDF файлове</strong>: Месечни прессъобщения от БНБ (януари-август 2025)</li>
                      <li><strong>JSON файл</strong>: <code>data/monthly-debt-data.json</code> - структурирани месечни данни</li>
                      <li>Данните се зареждат автоматично при стартиране на API route-а</li>
                    </ul>
                    
                    <h4>4. Автоматично откриване:</h4>
                    <ul>
                      <li>Приложението автоматично търси данни за 2025, 2026 и следващи години</li>
                      <li>Когато World Bank публикува нови данни, те се използват автоматично</li>
                      <li>Месечните данни от БНБ имат приоритет пред годишните данни от World Bank</li>
                      <li>Показва индикатор при откриване на нови данни</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <h3 className={styles.infoTitle}>🧮 Как се изчислява дългът на човек?</h3>
                  <div className={styles.infoContent}>
                    <div className={styles.formulaBox}>
                      <strong>Формула:</strong>
                      <div className={styles.formula}>
                        Дълг на човек = Общ външен дълг ÷ Население
                      </div>
                    </div>
                    
                    <h4>Пример:</h4>
                    <ul>
                      <li>Общ дълг: 58,000,000,000 USD</li>
                      <li>Население: 6,800,000 души</li>
                      <li>Дълг на човек: 58,000,000,000 ÷ 6,800,000 = <strong>8,529.41 USD</strong></li>
                    </ul>
                    
                    <h4>Конвертиране на валути:</h4>
                    <ul>
                      <li><strong>USD → EUR:</strong> 1 USD = 0.92 EUR (приблизително)</li>
                      <li><strong>USD → BGN:</strong> 1 USD = 1.80 BGN (приблизително)</li>
                      <li><strong>EUR → BGN:</strong> 1 EUR = 1.95583 BGN (фиксиран курс)</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <h3 className={styles.infoTitle}>📈 Реално време симулация</h3>
                  <div className={styles.infoContent}>
                    <h4>Дълг:</h4>
                    <ul>
                      <li>Промени на всеки 5-12 секунди</li>
                      <li>Вариация: -0.1% до +0.15% (реалистично)</li>
                      <li>Показва тренд: ↑ растеж (червено) / ↓ спад (зелено)</li>
                    </ul>
                    
                    <h4>Население:</h4>
                    <ul>
                      <li>Раждания: ~9.5 на 1000 души годишно</li>
                      <li>Смъртност: ~15.5 на 1000 души годишно</li>
                      <li>Нетна промяна: ~-6 на 1000 годишно (намаляване)</li>
                      <li>Симулация на всеки 2-8 секунди</li>
                    </ul>
                    
                    <h4>Статистика за днес:</h4>
                    <ul>
                      <li>Брои раждания от началото на деня</li>
                      <li>Брои смъртни случаи от началото на деня</li>
                      <li>Показва нетна промяна (обикновено отрицателна)</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <h3 className={styles.infoTitle}>📊 Графика</h3>
                  <div className={styles.infoContent}>
                    <ul>
                      <li>Показва развитието на дълга на човек през годините</li>
                      <li>Автоматично се обновява с реално време данни</li>
                      <li>Променя цветовете според валутата (EUR/BGN)</li>
                      <li>Интерактивна с tooltips при hover</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <h3 className={styles.infoTitle}>⚠️ Оценки и ограничения</h3>
                  <div className={styles.infoContent}>
                    <ul>
                      <li><strong>Реално време симулацията</strong> е приблизителна и се базира на исторически данни</li>
                      <li><strong>Курсовете на валутите</strong> са приблизителни и могат да варират</li>
                      <li><strong>Данните за населението</strong> в реално време са симулирани базирани на средни стойности</li>
                      <li><strong>World Bank данните</strong> се обновяват с известно забавяне (месечно/годишно)</li>
                      <li><strong>БНБ данните</strong> са най-актуалните, но се публикуват месечно</li>
                      <li>За точни официални данни вижте <a href="https://www.bnb.bg" target="_blank" rel="noopener noreferrer" className={styles.infoLink}>БНБ</a> и <a href="https://data.worldbank.org" target="_blank" rel="noopener noreferrer" className={styles.infoLink}>World Bank</a></li>
                    </ul>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <h3 className={styles.infoTitle}>🔗 Източници</h3>
                  <div className={styles.infoContent}>
                    <h4>Официални източници:</h4>
                    <ul>
                      <li><a href="https://www.bnb.bg/AboutUs/PressOffice/POStatisticalPressReleases/POPRSGrossExternalDebt/" target="_blank" rel="noopener noreferrer" className={styles.infoLink}>БНБ - Брутен външен дълг</a> (месечни прессъобщения)</li>
                      <li><a href="https://data.worldbank.org" target="_blank" rel="noopener noreferrer" className={styles.infoLink}>World Bank Open Data</a> (годишни данни)</li>
                      <li><a href="https://worldbank.github.io/debt-data/api-guide/ids-api-guide-r-1.html" target="_blank" rel="noopener noreferrer" className={styles.infoLink}>World Bank Debt Data API Guide</a></li>
                    </ul>
                    
                    <h4>Локални данни в проекта:</h4>
                    <ul>
                      <li><code>data/s_ged_press_a2_bg.xlsx</code> - Excel файл с детайлни данни от БНБ</li>
                      <li><code>data/monthly-debt-data.json</code> - Структурирани месечни данни</li>
                      <li><code>data/2025*.pdf</code> - PDF прессъобщения от БНБ (януари-август 2025)</li>
                    </ul>
                    
                    <h4>API endpoints:</h4>
                    <ul>
                      <li><code>/api/debt</code> - Текущи данни за дълг и население</li>
                      <li><code>/api/debt/history</code> - Исторически данни за графиката</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

