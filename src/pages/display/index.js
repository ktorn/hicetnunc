import React, { Component } from 'react'
import { Button, Primary } from '../../components/button'
import { HicetnuncContext } from '../../context/HicetnuncContext'
import { Page, Container, Padding } from '../../components/layout'
import { Loading } from '../../components/loading'
import { renderMediaType } from '../../components/media-types'
import { PATH } from '../../constants'
import { ResponsiveMasonry } from '../../components/responsive-masonry'
import styles from './styles.module.scss'
import { forEach } from 'lodash'

const axios = require('axios')
const fetch = require('node-fetch')

const query_creations = `
query creatorGallery($address: String!) {
  hic_et_nunc_token(where: {creator: {address: {_eq: $address}}, supply: {_gt: 0}}, order_by: {id: desc}) {
    id
    artifact_uri
    display_uri
    thumbnail_uri
    timestamp
    mime
    title
    description
    supply
    token_tags {
      tag {
        tag
      }
    }
  }
}
`;

async function fetchFrensCreationsGraphQL(operationsDoc, operationName, variables) {
  const result = await fetch(
    "https://api.hicdex.com/v1/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query: operationsDoc,
        variables: variables,
        operationName: operationName
      })
    }
  );
  return await result.json()
}

async function fetchFrensCreations(frensAddresses) {
  
  const { errors, data } = await fetchFrensCreationsGraphQL(query_creations, "creatorGallery", { "address": frensAddresses[0] });
  if (errors) {
    console.error(errors);
  }
  const result = data.hic_et_nunc_token
  /* console.log({ result }) */
  return result
}

const query_frens = `
  query collectorGallery($address: String!) {
    hic_et_nunc_token_holder(where: {holder_id: {_eq: $address}, quantity: {_gt: "0"}, token: {supply: {_gt: "0"}}}, order_by: {id: desc}) {
      token {
        id
        artifact_uri
        display_uri
        thumbnail_uri
        timestamp
        mime
        title
        description
        supply
        token_tags {
          tag {
            tag
          }
        }
        creator {
          address
        }
      }
    }
  }
`;

async function fetchFrensGraphQL(operationsDoc, operationName, variables) {
  const result = await fetch(
    "https://api.hicdex.com/v1/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query: operationsDoc,
        variables: variables,
        operationName: operationName
      })
    }
  );

  return await result.json();
}

async function fetchAllFrens(addr) {
  const { errors, data } = await fetchFrensGraphQL(query_frens, "collectorGallery", {"address":addr});
  if (errors) {
    console.error(errors);
  }
  let results = data.hic_et_nunc_token_holder.map(function(result) {
    return result['token'];
  });

  console.log({ results })

  let frensAddresses = []

  results.forEach(function(result) {
    frensAddresses.push(result.creator.address);
  })

  let frensAddressesFiltered = frensAddresses.filter((item,index) =>{
    return frensAddresses.indexOf(item) === index;
  })

  console.log({ frensAddressesFiltered })

  return frensAddressesFiltered
}

export default class Display extends Component {
  static contextType = HicetnuncContext

  state = {
    wallet: '',
    render: false,
    loading: true,
    creations: [],
  }

  componentWillMount = async () => {
    const id = window.location.pathname.split('/')[1]
    if (id === 'tz') {
      const wallet = window.location.pathname.split('/')[2]
      this.setState({
        wallet,
      })

      this.onReady()
    } else {
      await axios
        .then((res) => {
          if (res.data.result.length === 0) {
            // if alias is not found, redirect to homepage
            this.props.history.push('/')
          } else {
            this.setState({
              wallet: res.data.result[0].tz,
            })

            this.onReady()
          }
        })
    }
    //console.log(window.location.pathname.split('/'))
  }

  // called if there's no redirect
  onReady = async () => {
    this.context.setPath(window.location.pathname)

    let addr = ''
    
    if (window.location.pathname.split('/')[1] === 'tz') {
      addr = window.location.pathname.split('/')[2]
    }

    //fetch collection promise, return addresses
    //fetch creations of collection wallet addresses
    const frensAddresses = await fetchAllFrens(addr);
    console.log(frensAddresses)
    const frensCreations = await fetchFrensCreations(frensAddresses)
    //console.log(creations)

    this.setState({
      creations: frensCreations,
      loading: false,
    })

  }

  render() {
    return (
      <Page title={this.state.alias}>
        <Container>
          <Padding>
            <p>
              <strong>{this.state.wallet}</strong>
            </p>
          </Padding>
        </Container>

        {this.state.loading && (
          <Container>
            <Padding>
              <Loading />
            </Padding>
          </Container>
        )}

        {!this.state.loading && (
          <Container xlarge>
            <ResponsiveMasonry>
              {this.state.creations.map((nft, i) => {
                const mimeType = nft.mime
                const uri = nft.artifact_uri

                return (
                  <Button
                    key={nft.id}
                    to={`${PATH.OBJKT}/${nft.id}`}
                  >
                    <div className={styles.container}>
                      {renderMediaType({
                        mimeType,
                        uri: uri.split('//')[1],
                        metadata: nft,
                      })}
                    </div>
                  </Button>
                )
              })}
            </ResponsiveMasonry>
          </Container>
        )}
      </Page>
    )
  }
}
