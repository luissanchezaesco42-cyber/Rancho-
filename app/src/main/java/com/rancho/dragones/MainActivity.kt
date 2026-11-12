package com.rancho.dragones

import android.app.Activity
import android.os.Bundle
import com.rancho.dragones.data.SaveStore
import com.rancho.dragones.ui.Game
import com.rancho.dragones.ui.GameView

class MainActivity : Activity() {
    private lateinit var view: GameView
    private lateinit var game: Game

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val store = SaveStore(this)
        val state = store.load(System.currentTimeMillis())
        game = Game(state, onSave = { store.save(it) })
        view = GameView(this, game)
        setContentView(view)
    }

    override fun onResume() {
        super.onResume()
        view.start()
    }

    override fun onPause() {
        view.stop()
        super.onPause()
    }
}
