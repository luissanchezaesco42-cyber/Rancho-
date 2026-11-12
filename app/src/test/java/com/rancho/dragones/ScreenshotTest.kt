package com.rancho.dragones

import android.app.Application
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.SystemClock
import android.view.MotionEvent
import org.robolectric.RuntimeEnvironment
import com.rancho.dragones.logic.Rules
import com.rancho.dragones.model.Dragon
import com.rancho.dragones.model.Element
import com.rancho.dragones.model.GameState
import com.rancho.dragones.ui.Game
import com.rancho.dragones.ui.GameView
import java.io.File
import kotlin.random.Random
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Renderiza cada pantalla a PNG y recorre los flujos principales tocando como un jugador. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34])
class ScreenshotTest {
    private val outDir = File(System.getenv("SHOT_DIR") ?: "build/shots").also { it.mkdirs() }
    private val scale = 3f
    private val w = (360 * scale).toInt()
    private val h = (760 * scale).toInt()
    private var clockMs = 10_000_000L
    private var t = 0f

    private fun newGame(): Game {
        val s = GameState.newGame(clockMs)
        return Game(s, clock = { clockMs }, rng = Random(42))
    }

    private fun shot(view: GameView, name: String) {
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        view.render(Canvas(bmp), w.toFloat(), h.toFloat(), t)
        File(outDir, "$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bmp.recycle()
    }

    /** Dibuja dos fotogramas (los toques usan las zonas del anterior) avanzando el tiempo de animación. */
    private fun frames(view: GameView, n: Int = 2, dt: Float = 0.05f) {
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        repeat(n) { t += dt; view.render(Canvas(bmp), w.toFloat(), h.toFloat(), t) }
        bmp.recycle()
    }

    private fun tap(view: GameView, vx: Float, vy: Float) {
        val now = SystemClock.uptimeMillis()
        val x = vx * scale
        val y = vy * scale
        view.onTouchEvent(MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, x, y, 0))
        view.onTouchEvent(MotionEvent.obtain(now, now + 30, MotionEvent.ACTION_UP, x, y, 0))
        frames(view)
    }

    private fun makeView(game: Game): GameView {
        val app = RuntimeEnvironment.getApplication() as Application
        val v = GameView(app, game)
        frames(v)
        return v
    }

    private fun richGame(): Game {
        val g = newGame()
        val s = g.state
        s.gold = 5000; s.gems = 20; s.food = 12
        Rules.buyHabitat(s, Element.AGUA, 2)
        Rules.buyHabitat(s, Element.PLANTA, 6)
        Rules.buyHabitat(s, Element.AIRE, 1)
        val a = Rules.buyDragon(s, "aquor").value!!
        val f = Rules.buyDragon(s, "floravis").value!!
        val z = Rules.buyDragon(s, "zefiro").value!!
        val sol = Dragon(s.newId(), "solarion", 6).also { s.dragons.add(it) }
        Rules.place(s, a.id, s.habitats[1].id)
        Rules.place(s, f.id, s.habitats[2].id)
        Rules.place(s, z.id, s.habitats[3].id)
        Rules.place(s, sol.id, s.habitats[0].id)
        Rules.addXp(s.dragons[0], 200)
        clockMs += 40 * 60_000L
        g.tick()
        return g
    }

    @Test fun cityAndTabs() {
        val g = richGame()
        val v = makeView(g)
        shot(v, "01_ciudad")
        // abrir el hábitat central (casilla 4)
        tap(v, 180f, 330f)
        shot(v, "02_ciudad_habitat")
        for (name in listOf("03_criadero", "04_batalla", "05_coleccion", "06_tienda")) {
            // salir del modal y cambiar de pestaña
            tap(v, 322f, 194f)
            val idx = listOf("03_criadero", "04_batalla", "05_coleccion", "06_tienda").indexOf(name) + 1
            tap(v, 36f + 72f * idx, 730f)
            shot(v, name)
        }
    }

    @Test fun hatcheryFlow() {
        val g = richGame()
        val v = makeView(g)
        tap(v, 108f, 730f) // criadero
        tap(v, 180f, 182f) // "Criar dragones"
        shot(v, "10_criar_elegir_a")
        tap(v, 300f, 195f) // primer "Elegir"
        shot(v, "11_criar_elegir_b")
        tap(v, 300f, 195f)
        shot(v, "12_huevo_incubando")
        assertTrue(g.state.eggs.size == 1)
        clockMs += 10 * 60_000L
        frames(v)
        shot(v, "13_huevo_listo")
        tap(v, 240f, 185f) // abrir
        shot(v, "14_nacimiento")
        assertTrue(g.state.eggs.isEmpty())
    }

    @Test fun battleFlow() {
        val g = richGame()
        val v = makeView(g)
        tap(v, 180f, 730f) // batalla
        shot(v, "20_batalla_seleccion")
        tap(v, 302f, 266f) // primer "Luchar"
        shot(v, "21_batalla_inicio")
        var guard = 0
        while (guard++ < 40) {
            tap(v, 100f, 640f) // ataque
            repeat(25) { frames(v, 1, 0.05f) }
            if (g.state.bestWave > 0 || guard > 38) break
            if (guard == 2) shot(v, "22_batalla_en_curso")
        }
        shot(v, "23_batalla_fin")
    }
}
