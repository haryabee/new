export default {
	props: {
		foo: true
	},

	html: `true`,

	skip: /^v4/.test( process.version ), // node 4 apparently does some dumb stuff
	'skip-ssr': true, // there's some kind of weird bug with this test... it compiles with the wrong require.extensions hook for some bizarre reason

	test ( assert, component, target, window ) {
		const event = new window.Event( 'click' );

		window.dispatchEvent( event );
		assert.equal( component.foo, false );
		assert.htmlEqual( target.innerHTML, `false` );

		window.dispatchEvent( event );
		assert.equal( component.foo, true );
		assert.htmlEqual( target.innerHTML, `true` );

		component.destroy();
	}
};