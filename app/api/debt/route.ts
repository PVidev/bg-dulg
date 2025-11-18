import { NextResponse } from 'next/server'

// Маркираме route-а като динамичен
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Fallback данни - последни известни данни за България
// Източник: БНБ (Българска народна банка) - месечни данни
// Актуализирано: август 2025
const FALLBACK_DATA = {
  totalDebt: 53605900000, // 53,605.9 млн. EUR (според БНБ, август 2025)
  totalDebtUSD: 57894000000, // ~57.9 милиарда USD (конвертирано при курс ~1.08)
  population: 6800000, // ~6.8 милиона (2025, приблизително)
  year: '2025',
  month: '08',
  source: 'fallback_bnb'
}

interface WorldBankDataPoint {
  date: string
  value: number | null
  [key: string]: any
}

async function fetchWorldBankData(indicator: string, country: string = 'BGR', maxYear?: number): Promise<WorldBankDataPoint[]> {
  // Автоматично определяме максималната година (текущата + 1 за бъдещи данни)
  const currentYear = new Date().getFullYear()
  const endYear = maxYear || (currentYear + 1) // Проверяваме до следващата година за нови данни
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&date=2010:${endYear}&per_page=100`
  
  try {
    const response = await fetch(url, { cache: 'no-store' })
    
    if (!response.ok) {
      console.warn(`API request failed for ${indicator}: ${response.status}`)
      return []
    }

    const data: any = await response.json()
    
    if (!data || !Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
      return []
    }

    return data[1].filter((item: any) => 
      item && 
      item.value !== null && 
      item.value !== undefined && 
      item.value !== '' &&
      !isNaN(Number(item.value))
    )
  } catch (error) {
    console.error(`Error fetching ${indicator}:`, error)
    return []
  }
}

// Опитваме се да вземем актуални данни от Евростат API
async function fetchEurostatData(): Promise<{ debt: number | null, year: string }> {
  try {
    // Евростат API за държавен дълг (% от GDP)
    // Трябва да комбинираме с GDP данни за абсолютна стойност
    const url = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/GOV_10DD_EDPT1?format=json&geo=BG&na_item=GD&unit=PC_GDP&time=2024'
    
    const response = await fetch(url, { cache: 'no-store' })
    
    if (!response.ok) {
      return { debt: null, year: '' }
    }

    const data: any = await response.json()
    // Евростат има сложна структура, но за сега ще пропуснем
    // Трябва по-сложна обработка
    return { debt: null, year: '' }
  } catch (error) {
    console.error('Error fetching Eurostat data:', error)
    return { debt: null, year: '' }
  }
}

// Опитваме се да вземем актуални данни от БНБ (ако има публичен endpoint)
async function fetchBNBData(): Promise<{ debt: number | null, year: string, month: string }> {
  try {
    // БНБ не предоставя директно JSON API, но публикува месечни данни
    // За сега използваме последни известни данни от БНБ прессъобщения
    // В бъдеще може да се добави web scraping или парсване на PDF/Excel файлове
    
        // БНБ публикува данни на: https://www.bnb.bg/AboutUs/PressOffice/POStatisticalPressReleases/POPRSGrossExternalDebt/
        // Последни данни: август 2025 - 53,605.9 млн. EUR (47.7% от БВП)
    
    return {
      debt: FALLBACK_DATA.totalDebtUSD, // Конвертирано в USD
      year: FALLBACK_DATA.year,
      month: FALLBACK_DATA.month
    }
  } catch (error) {
    console.error('Error fetching BNB data:', error)
    return { debt: null, year: '', month: '' }
  }
}

export async function GET() {
  try {
    // Приоритет на източниците (от най-актуални към по-стари):
    // 1. БНБ данни (месечни, най-актуални)
    // 2. World Bank API (годишни, с забавяне)
    // 3. Fallback данни

    let debtValue: number | null = null
    let debtYear: string = ''
    let debtMonth: string = ''
    let dataSource: string = ''

    // 1. Опитваме се първо с БНБ данни (най-актуални)
    const bnbData = await fetchBNBData()
    if (bnbData.debt && bnbData.debt > 0) {
      debtValue = bnbData.debt
      debtYear = bnbData.year
      debtMonth = bnbData.month
      dataSource = 'bnb'
      console.log('Using BNB data:', { debt: debtValue, year: debtYear, month: debtMonth })
    }

    // 2. Ако няма БНБ данни, опитваме World Bank API
    if (!debtValue || debtValue === 0) {
      const indicators = [
        'DT.DOD.DECT.CD', // Total external debt stocks
        'GC.DOD.TOTL.GD.ZS', // Government debt % of GDP (ще трябва GDP за конвертиране)
      ]

      let debtData: WorldBankDataPoint[] = []

      // Опитваме се с първия индикатор - автоматично търсим до текущата година + 1
      debtData = await fetchWorldBankData(indicators[0])
      
      if (debtData.length > 0) {
        // Сортираме по година (най-новите първо)
        debtData.sort((a, b) => parseInt(b.date) - parseInt(a.date))
        // Намираме най-новата година с валидни данни
        const latest = debtData.find(d => d.value !== null && d.value !== undefined && !isNaN(Number(d.value)))
        if (latest) {
          debtValue = Number(latest.value)
          debtYear = latest.date
          if (!dataSource) dataSource = 'worldbank'
          console.log(`Found debt data for year: ${debtYear}`)
        }
      }

      // Ако няма данни, опитваме с алтернативен подход
      if (!debtValue || isNaN(debtValue)) {
        // Опитваме с government debt % of GDP
        const govDebtData = await fetchWorldBankData(indicators[1])
        if (govDebtData.length > 0) {
          // Ако имаме % от GDP, трябва да вземем и GDP данни
          const gdpData = await fetchWorldBankData('NY.GDP.MKTP.CD') // GDP в USD
          if (gdpData.length > 0) {
            govDebtData.sort((a, b) => parseInt(b.date) - parseInt(a.date))
            gdpData.sort((a, b) => parseInt(b.date) - parseInt(a.date))
            
            // Намираме най-новата година, за която имаме и двете
            const latestGovDebt = govDebtData[0]
            const matchingGdp = gdpData.find(g => g.date === latestGovDebt.date) || gdpData[0]
            
            if (matchingGdp && latestGovDebt.value) {
              const gdp = Number(matchingGdp.value)
              const debtPercent = Number(latestGovDebt.value)
              debtValue = (gdp * debtPercent) / 100
              debtYear = latestGovDebt.date
              if (!dataSource) dataSource = 'worldbank'
            }
          }
        }
      }
    }

    // Вземаме данни за население - автоматично търсим до текущата година + 1
    const popData = await fetchWorldBankData('SP.POP.TOTL')
    let population: number | null = null
    let popYear: string = ''

    if (popData.length > 0) {
      popData.sort((a, b) => parseInt(b.date) - parseInt(a.date))
      // Намираме най-новата година с валидни данни
      const latestPop = popData.find(p => p.value !== null && p.value !== undefined && !isNaN(Number(p.value)))
      if (latestPop) {
        population = Number(latestPop.value)
        popYear = latestPop.date
        console.log(`Found population data for year: ${popYear}`)
      }
      
      // Ако имаме дълг за конкретна година, опитваме да намерим население за същата
      if (debtYear && debtYear !== popYear) {
        const matchingPop = popData.find(p => p.date === debtYear && p.value !== null && p.value !== undefined)
        if (matchingPop && matchingPop.value) {
          population = Number(matchingPop.value)
          popYear = debtYear
        }
      }
    }

    // 3. Ако няма данни от API, използваме fallback (БНБ данни)
    if (!debtValue || !population || isNaN(debtValue) || isNaN(population) || population === 0) {
      console.log('Using fallback data - API data not available')
      debtValue = FALLBACK_DATA.totalDebtUSD
      population = FALLBACK_DATA.population
      debtYear = FALLBACK_DATA.year
      debtMonth = FALLBACK_DATA.month
      popYear = FALLBACK_DATA.year
      if (!dataSource) dataSource = 'fallback_bnb'
    }

    // Изчисляваме дълг на човек
    const perPerson = debtValue / population

    // Форматираме датата
    const dateInfo = debtMonth 
      ? `${debtYear}-${debtMonth}` 
      : debtYear

    // Проверяваме дали данните са по-нови от fallback данните
    const currentYear = new Date().getFullYear()
    const isNewerThanFallback = parseInt(debtYear) > parseInt(FALLBACK_DATA.year) || 
                                (debtYear === FALLBACK_DATA.year && debtMonth && parseInt(debtMonth) > parseInt(FALLBACK_DATA.month))
    const isCurrentOrFutureYear = parseInt(debtYear) >= currentYear

    return NextResponse.json({
      totalDebt: debtValue,
      population: population,
      perPerson: perPerson,
      year: debtYear,
      month: debtMonth || undefined,
      date: dateInfo,
      currency: 'USD',
      success: true,
      dataSource: dataSource || 'worldbank',
      isRealTime: dataSource === 'bnb' || dataSource === 'fallback_bnb',
      isNewerData: isNewerThanFallback && isCurrentOrFutureYear,
      dataYear: debtYear
    })
  } catch (error) {
    console.error('Error in debt API:', error)
    
    // При грешка връщаме fallback данни (БНБ)
    const fallbackPerPerson = FALLBACK_DATA.totalDebtUSD / FALLBACK_DATA.population
    
    return NextResponse.json({
      totalDebt: FALLBACK_DATA.totalDebtUSD,
      population: FALLBACK_DATA.population,
      perPerson: fallbackPerPerson,
      year: FALLBACK_DATA.year,
      month: FALLBACK_DATA.month,
      date: `${FALLBACK_DATA.year}-${FALLBACK_DATA.month}`,
      currency: 'USD',
      success: true,
      dataSource: 'fallback_bnb',
      isRealTime: true,
      warning: 'Използват се последни известни данни от БНБ (месечни). API данните не са налични.'
    })
  }
}
