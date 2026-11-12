package com.rancho.dragones

import com.rancho.dragones.data.SaveCodec
import com.rancho.dragones.logic.Action
import com.rancho.dragones.logic.Battle
import com.rancho.dragones.logic.BattleRewards
import com.rancho.dragones.logic.ElementChart
import com.rancho.dragones.logic.Fighter
import com.rancho.dragones.logic.Rules
import com.rancho.dragones.model.Dragon
import com.rancho.dragones.model.Element
import com.rancho.dragones.model.GameState
import com.rancho.dragones.model.SpeciesCatalog
import kotlin.random.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RulesTest {
    private val t0 = 1_000_000L

    private fun newState() = GameState.newGame(t0)

    // ---------- Elementos ----------

    @Test fun noElementPairHasMutualAdvantage() {
        for (a in Element.values()) for (b in Element.values()) {
            assertFalse("$a y $b se ganan mutuamente", b in a.beats() && a in b.beats())
        }
    }

    @Test fun everyElementBeatsTwoAndLosesToAtLeastOne() {
        for (e in Element.values()) {
            assertEquals(2, e.beats().size)
            assertTrue(Element.values().any { e in it.beats() })
        }
    }

    @Test fun multiplierValues() {
        assertEquals(2.0, ElementChart.multiplier(Element.FUEGO, Element.PLANTA), 0.0)
        assertEquals(0.5, ElementChart.multiplier(Element.PLANTA, Element.FUEGO), 0.0)
        assertEquals(1.0, ElementChart.multiplier(Element.FUEGO, Element.RAYO), 0.0)
        assertEquals(1.5, ElementChart.multiplier(Element.FUEGO, listOf(Element.PLANTA, Element.RAYO)), 0.0)
    }

    // ---------- Nivel y XP ----------

    @Test fun addXpLevelsUpAndCarriesOver() {
        val d = Dragon(1, "pyrion")
        val gained = Rules.addXp(d, 100) // 30 -> nivel 2 (quedan 70), 60 -> nivel 3 (quedan 10)
        assertEquals(2, gained)
        assertEquals(3, d.level)
        assertEquals(10, d.xp)
    }

    @Test fun levelIsCapped() {
        val d = Dragon(1, "pyrion")
        Rules.addXp(d, 1_000_000)
        assertEquals(Rules.MAX_LEVEL, d.level)
        assertEquals(0, d.xp)
        assertEquals(0, Rules.addXp(d, 50))
    }

    @Test fun statsGrowWithLevel() {
        val a = Dragon(1, "pyrion", 1)
        val b = Dragon(2, "pyrion", 10)
        assertTrue(Rules.maxHp(b) > Rules.maxHp(a))
        assertTrue(Rules.attack(b) > Rules.attack(a))
    }

    // ---------- Producción de oro ----------

    @Test fun goldAccumulatesOffline() {
        val s = newState()
        Rules.advance(s, t0 + 10 * 60_000L) // 10 min, 3 oro/min
        assertEquals(30.0, s.habitats[0].pendingGold, 1e-9)
        assertEquals(t0 + 10 * 60_000L, s.lastTickAt)
    }

    @Test fun goldIsCapped() {
        val s = newState()
        Rules.advance(s, t0 + 24 * 60 * 60_000L)
        assertEquals(3.0 * Rules.GOLD_CAP_MINUTES, s.habitats[0].pendingGold, 1e-9)
    }

    @Test fun collectMovesWholeGoldAndKeepsFraction() {
        val s = newState()
        s.habitats[0].pendingGold = 12.7
        val got = Rules.collect(s, s.habitats[0].id)
        assertEquals(12, got)
        assertEquals(612, s.gold)
        assertEquals(0.7, s.habitats[0].pendingGold, 1e-9)
    }

    @Test fun clockGoingBackwardsDoesNothing() {
        val s = newState()
        Rules.advance(s, t0 - 5 * 60_000L)
        assertEquals(0.0, s.habitats[0].pendingGold, 0.0)
    }

    // ---------- Compras ----------

    @Test fun buyHabitatChargesAndUsesFreeSlot() {
        val s = newState()
        val cost = Rules.habitatCost(s)
        val r = Rules.buyHabitat(s, Element.AGUA)
        assertTrue(r.ok)
        assertEquals(600L - cost, s.gold)
        assertEquals(2, s.habitats.size)
        assertEquals(setOf(4, 0), s.habitats.map { it.slot }.toSet())
    }

    @Test fun buyHabitatFailsWithoutGold() {
        val s = newState()
        s.gold = 10
        assertFalse(Rules.buyHabitat(s, Element.AGUA).ok)
        assertEquals(1, s.habitats.size)
    }

    @Test fun buyDragonOnlyBasics() {
        val s = newState()
        assertTrue(Rules.buyDragon(s, "aquor").ok)
        assertEquals(300L, s.gold)
        assertFalse(Rules.buyDragon(s, "solarion").ok)
    }

    @Test fun foodAndGemPacks() {
        val s = newState()
        assertNull(Rules.buyFood(s))
        assertEquals(10, s.food)
        s.gold = 5
        assertNotNull(Rules.buyFood(s))
        assertNotNull(Rules.buyGems(s))
        s.gold = 1000
        assertNull(Rules.buyGems(s))
        assertEquals(7, s.gems)
    }

    // ---------- Hábitats ----------

    @Test fun placeRespectsElementAndCapacity() {
        val s = newState()
        val fire = s.habitats[0]
        val water = Rules.buyHabitat(s, Element.AGUA).value!!
        val aquor = Rules.buyDragon(s, "aquor").value!!
        assertNotNull(Rules.place(s, aquor.id, fire.id)) // elemento incorrecto
        assertNull(Rules.place(s, aquor.id, water.id))
        assertNotNull(Rules.place(s, aquor.id, water.id)) // ya colocado
        repeat(2) {
            val d = Dragon(s.newId(), "aquor").also { s.dragons.add(it) }
            assertNull(Rules.place(s, d.id, water.id))
        }
        val extra = Dragon(s.newId(), "aquor").also { s.dragons.add(it) }
        assertNotNull(Rules.place(s, extra.id, water.id)) // lleno
    }

    @Test fun hybridCanLiveInEitherElement() {
        val s = newState()
        val d = Dragon(s.newId(), "solarion").also { s.dragons.add(it) }
        val air = Rules.buyHabitat(s, Element.AIRE).value!!
        assertNull(Rules.place(s, d.id, air.id))
        Rules.remove(s, d.id)
        assertNull(Rules.place(s, d.id, s.habitats[0].id)) // fuego
    }

    @Test fun removeClampsPendingGold() {
        val s = newState()
        val h = s.habitats[0]
        h.pendingGold = 360.0
        Rules.remove(s, h.dragonIds[0])
        assertEquals(0.0, h.pendingGold, 0.0)
    }

    @Test fun feedConsumesFoodAndGivesXp() {
        val s = newState()
        val d = s.dragons[0]
        assertNull(Rules.feed(s, d.id))
        assertEquals(4, s.food)
        assertEquals(Rules.FOOD_XP, d.xp)
        s.food = 0
        assertNotNull(Rules.feed(s, d.id))
    }

    @Test fun cannotSellLastDragon() {
        val s = newState()
        assertNotNull(Rules.sell(s, s.dragons[0].id))
        val extra = Rules.buyDragon(s, "terrax").value!!
        val before = s.gold
        assertNull(Rules.sell(s, extra.id))
        assertEquals(before + Rules.sellPrice(extra), s.gold)
        assertEquals(1, s.dragons.size)
    }

    @Test fun sellingPlacedDragonFreesHabitat() {
        val s = newState()
        val extra = Rules.buyDragon(s, "pyrion").value!!
        Rules.place(s, extra.id, s.habitats[0].id)
        assertNull(Rules.sell(s, extra.id))
        assertEquals(1, s.habitats[0].dragonIds.size)
    }

    // ---------- Fusión ----------

    @Test fun fusionOfSameElementGivesBasic() {
        val p = SpeciesCatalog.get("pyrion")
        repeat(20) { assertEquals("pyrion", Rules.fusionResult(p, p, Random(it)).id) }
    }

    @Test fun fusionWithRecipeUsuallyGivesHybrid() {
        val a = SpeciesCatalog.get("pyrion")
        val b = SpeciesCatalog.get("zefiro")
        val ids = (0 until 400).map { Rules.fusionResult(a, b, Random(it)).id }
        val hybrids = ids.count { it == "solarion" }
        assertTrue("híbridos=$hybrids", hybrids in 300..380)
        assertTrue(ids.all { it == "solarion" || it == "pyrion" || it == "zefiro" })
    }

    @Test fun fusionWithoutRecipeGivesParentBasic() {
        val a = SpeciesCatalog.get("pyrion")
        val b = SpeciesCatalog.get("voltrix") // FUEGO+RAYO no tiene receta
        repeat(50) { assertTrue(Rules.fusionResult(a, b, Random(it)).id in setOf("pyrion", "voltrix")) }
    }

    @Test fun everyHybridHasAReachableRecipe() {
        for (h in SpeciesCatalog.hybrids) {
            val r = SpeciesCatalog.hybridFor(h.primary, h.secondary!!)
            assertEquals(h, r)
        }
    }

    @Test fun eggLifecycle() {
        val s = newState()
        val other = Rules.buyDragon(s, "zefiro").value!!
        val egg = Rules.startFusion(s, s.dragons[0].id, other.id, t0, Random(1)).value!!
        assertEquals(1, s.eggs.size)
        assertFalse(Rules.hatch(s, 0, t0 + 1000).ok) // no está listo
        val remaining = Rules.remainingSec(egg, t0)
        assertTrue(remaining > 0)
        s.gems = 100
        val cost = Rules.speedUpCost(egg, t0)
        assertTrue(cost >= 1)
        assertNull(Rules.speedUp(s, 0, t0))
        assertEquals(100 - cost, s.gems)
        val hatched = Rules.hatch(s, 0, t0)
        assertTrue(hatched.ok)
        assertEquals(0, s.eggs.size)
        assertEquals(3, s.dragons.size)
    }

    @Test fun hatcheryHasLimitedSlots() {
        val s = newState()
        val other = Rules.buyDragon(s, "zefiro").value!!
        repeat(Rules.HATCHERY_SLOTS) { assertTrue(Rules.startFusion(s, s.dragons[0].id, other.id, t0, Random(it)).ok) }
        assertFalse(Rules.startFusion(s, s.dragons[0].id, other.id, t0, Random(9)).ok)
        assertFalse(Rules.startFusion(s, other.id, other.id, t0, Random(9)).ok)
    }

    @Test fun speedUpFailsWithoutGems() {
        val s = newState()
        val other = Rules.buyDragon(s, "zefiro").value!!
        Rules.startFusion(s, s.dragons[0].id, other.id, t0, Random(1))
        s.gems = 0
        assertNotNull(Rules.speedUp(s, 0, t0))
        assertEquals(1, s.eggs.size)
    }

    // ---------- Combate ----------

    private fun fighter(id: String, level: Int = 1) = Fighter.of(Dragon(0, id, level))

    @Test fun advantageDealsMoreDamage() {
        val fireVsPlant = Battle(fighter("pyrion"), fighter("floravis"), 1, Random(1)).playerAct(Action.ATTACK)!!
        val fireVsWater = Battle(fighter("pyrion"), fighter("aquor"), 1, Random(1)).playerAct(Action.ATTACK)!!
        assertEquals(2.0, fireVsPlant.multiplier, 0.0)
        assertEquals(0.5, fireVsWater.multiplier, 0.0)
        assertTrue(fireVsPlant.damage > fireVsWater.damage * 3)
    }

    @Test fun skillHasCooldown() {
        val b = Battle(fighter("pyrion", 10), fighter("terrax", 20), 1, Random(1))
        assertNotNull(b.playerAct(Action.SKILL))
        assertNull(b.playerAct(Action.SKILL))
        repeat(Battle.SKILL_COOLDOWN) { assertNotNull(b.playerAct(Action.ATTACK)) }
        assertNotNull(b.playerAct(Action.SKILL))
    }

    @Test fun battleEndsWhenSomeoneFaints() {
        val b = Battle(fighter("pyrion", 20), fighter("floravis", 1), 1, Random(3))
        var guard = 0
        while (!b.over && guard++ < 50) b.playerAct(Action.ATTACK)
        assertTrue(b.over)
        assertTrue(b.playerWon)
        assertNull(b.playerAct(Action.ATTACK))
        assertNull(b.enemyAct())
    }

    @Test fun enemyCanWin() {
        val b = Battle(fighter("floravis", 1), fighter("pyrion", 20), 1, Random(3))
        var guard = 0
        while (!b.over && guard++ < 50) b.enemyAct()
        assertTrue(b.over)
        assertFalse(b.playerWon)
    }

    @Test fun enemiesScaleWithWaveAndBossesAreTougher() {
        val rng = Random(5)
        val early = Battle.enemyFor(1, rng)
        val late = Battle.enemyFor(19, rng)
        assertTrue(late.level > early.level)
        val boss = Battle.enemyFor(10, Random(7))
        assertTrue(boss.name.startsWith("Jefe"))
        assertTrue(Battle.isBoss(10) && !Battle.isBoss(9))
    }

    @Test fun victoryGivesRewardsAndAdvancesWave() {
        val s = newState()
        val d = s.dragons[0]
        val r = BattleRewards.applyVictory(s, d.id, 1, Random(0))
        assertEquals(600L + Battle.goldReward(1), s.gold)
        assertEquals(Battle.xpReward(1), r.xp)
        assertEquals(2, s.wave)
        assertEquals(1, s.bestWave)
        val boss = BattleRewards.applyVictory(s, d.id, 5, Random(0))
        assertEquals(2, boss.gems)
    }

    // ---------- Guardado ----------

    @Test fun saveRoundTrip() {
        val s = newState()
        val other = Rules.buyDragon(s, "zefiro").value!!
        Rules.startFusion(s, s.dragons[0].id, other.id, t0, Random(1))
        s.habitats[0].pendingGold = 42.5
        s.wave = 4
        s.bestWave = 3
        Rules.addXp(s.dragons[0], 45)
        val copy = SaveCodec.decode(SaveCodec.encode(s))
        assertEquals(SaveCodec.encode(s), SaveCodec.encode(copy))
        assertEquals(s.gold, copy.gold)
        assertEquals(42.5, copy.habitats[0].pendingGold, 0.0)
        assertEquals(s.dragons[0].level, copy.dragons[0].level)
        assertEquals(s.eggs[0].readyAt, copy.eggs[0].readyAt)
        assertEquals(4, copy.wave)
        assertEquals(s.nextId, copy.nextId)
        assertEquals(s.habitats[0].dragonIds, copy.habitats[0].dragonIds)
    }
}
