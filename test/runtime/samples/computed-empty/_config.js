export default {
	html: '<div>empty</div>',
	test ( assert, component, target ) {
		assert.equal( component.created, true );
		assert.equal( target.innerHTML, '<div>empty</div>' );
		component.destroy();
	}
};
