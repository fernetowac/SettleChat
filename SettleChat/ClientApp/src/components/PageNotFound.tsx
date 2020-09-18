import * as React from 'react';
import { connect } from 'react-redux';

const PageNotFound = () => (
    <div>
        <h1>Ups, page not found.</h1>
        <p>404 Not found</p>
    </div>
);

export default connect()(PageNotFound);
